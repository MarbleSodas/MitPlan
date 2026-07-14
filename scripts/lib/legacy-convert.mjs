// scripts/lib/legacy-convert.mjs
/**
 * Legacy (MitPlan v1 / Firebase) plan → XIVMitPlan v1.0 PlanDoc converter.
 *
 * The v1 Realtime Database shape (verified against the production
 * `xivmit` database, 1492 plans) is:
 *
 *   /plans/{planId} = {
 *     title, bossId, selectedBoss: { id, name },
 *     ownerId, createdAt, updatedAt, isPublic, version,
 *     selectedJobs: { tank: [...], healer: [...], ... },
 *     tankPositions: { mainTank, offTank },
 *     assignments: {
 *       [bossActionId]: [
 *         { id, name, tankPosition: 'mainTank'|'offTank',
 *           assignedAt, assignedBy, chargeIndex, ... }
 *       ]
 *     }
 *   }
 *
 * The new system stores plans as a Yjs PlanDoc whose `assignments`
 * Y.Map entries require a UUID `abilityId` and a UUID `eventId`. v1
 * keys abilities by a snake_case mitigation id (e.g. `reprisal`,
 * `hallowed_ground`) and events by a `bossActionId` (e.g.
 * `deep_cut_1`). This converter re-anchors both against the live
 * catalog:
 *
 *   - ability: match by `ability_id` (normalized) or by ability name.
 *   - event:   match a `bossActionId` to a timeline event by the
 *             action name embedded in the id (e.g. `deep_cut` → event
 *             whose `normalizedNames` include `deep-cut`).
 *
 * Anything that cannot be matched is preserved losslessly: a
 * deterministic placeholder UUID is used so the assignment stays
 * editable, the original identifiers are stashed on the row
 * (`legacyMitigationId` / `legacyBossActionId`) and in `notes`, and the
 * entire v1 payload is embedded in `meta.legacyPayload` so the UI can
 * render the original configuration verbatim.
 *
 * This module is plain ESM (no TS) so both the offline prepare script
 * and the DB-backed import script can use it.
 */
import * as Y from 'yjs';
import { createHash } from 'node:crypto';

export const LEGACY_SENTINEL_ENCOUNTER_ID = '00000000-0000-0000-0000-000000000003';

const normId = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

const normText = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Deterministic v5-style UUID from a stable namespace string. */
export function deterministicUuid(namespace) {
  const bytes = createHash('sha256').update(`xivmitplan:legacy:${namespace}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Tolerant parse of a v1 plan payload into a normalized shape. Never
 * throws — unknown/extra fields are preserved on the returned object so
 * downstream code can surface them.
 */
export function parseLegacyPlan(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const assignments = [];
  const raw = p.assignments && typeof p.assignments === 'object' ? p.assignments : {};
  for (const [bossActionId, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    for (const a of list) {
      if (!a || typeof a !== 'object') continue;
      assignments.push({
        bossActionId,
        mitigationId: a.id ?? a.mitigationId ?? null,
        mitigationName: a.name ?? null,
        tankPosition: a.tankPosition ?? null,
        assignedAt: a.assignedAt ?? null,
        assignedBy: a.assignedBy ?? null,
        chargeIndex: a.chargeIndex ?? null,
        raw: a,
      });
    }
  }
  return {
    raw: p,
    title: p.title ?? p.name ?? 'Imported legacy plan',
    bossId: p.bossId ?? null,
    selectedBossId: p.selectedBoss && typeof p.selectedBoss === 'object' ? p.selectedBoss.id ?? null : null,
    ownerId: p.ownerId ?? null,
    createdAt: p.createdAt ?? null,
    updatedAt: p.updatedAt ?? null,
    version: p.version ?? null,
    isPublic: p.isPublic ?? null,
    selectedJobs: p.selectedJobs ?? null,
    tankPositions: p.tankPositions ?? null,
    assignments,
  };
}

function raidTokenOf(candidate) {
  if (!candidate) return null;
  const m = normId(candidate).match(/(m\d+s|p\d+s|fru|ucob|t[0-9]+[a-z]?)/);
  return m ? m[1] : null;
}

/** Map a v1 boss reference to a new encounter id, or null if unknown. */
export function resolveEncounterId(bossId, selectedBossId, encounters) {
  const candidates = [selectedBossId, bossId].filter(Boolean);
  let fallback = null;
  for (const c of candidates) {
    const token = raidTokenOf(c);
    const nc = normId(c);
    for (const e of encounters) {
      const ne = normId(e.slug);
      const name = normText(e.name);
      if (ne === nc) return e.id;
      if (token && ne.startsWith(`${token}-`)) return e.id;
      if (name === normText(c)) return e.id;
      // Boss-name-only match (e.g. bossId "sugar-riot" inside "m1s-sugar-riot").
      if (!token && (ne.includes(nc) || nc.includes(ne))) fallback ??= e.id;
    }
  }
  return fallback;
}

export function resolveAbility(mitigationId, mitigationName, abilities) {
  if (!mitigationId && !mitigationName) return null;
  const nid = normId(mitigationId);
  const nname = normText(mitigationName ?? mitigationId);
  for (const a of abilities) {
    if (nid && normId(a.abilityId) === nid) return a;
    if (nid && normId(a.abilityId).startsWith(`${nid}-`)) return a;
    if (a.name && normText(a.name) === nname) return a;
    if (a.name && normText(a.name).startsWith(nname) && nname.length > 2) return a;
  }
  return null;
}

/**
 * Extract the "action" portion of a bossActionId. v1 ids look like
 * `deep_cut_1`, `tidal_roar_2`, `some_boss_specific_thing_3`. We drop
 * only the trailing sequence number and normalize separators, keeping
 * the rest as the action name for timeline matching.
 */
export function actionNameOf(bossActionId) {
  const parts = String(bossActionId ?? '').split(/[_-]/).filter(Boolean);
  if (parts.length <= 1) return normText(bossActionId);
  // Drop a trailing pure-integer sequence (the v1 "which occurrence" suffix).
  if (/^\d+$/.test(parts[parts.length - 1])) parts.pop();
  return normText(parts.join('_'));
}

export function resolveEvent(bossActionId, events) {
  if (!bossActionId) return null;
  const action = actionNameOf(bossActionId);
  for (const ev of events) {
    if (ev.normalizedNames && ev.normalizedNames.some((n) => normText(n) === action)) return ev;
    if (ev.name && normText(ev.name) === action) return ev;
  }
  return null;
}

function targetTypeFor(tankPosition) {
  if (tankPosition === 'mainTank' || tankPosition === 'MT') return 'MAIN_TANK';
  if (tankPosition === 'offTank' || tankPosition === 'OT') return 'OFF_TANK';
  if (tankPosition === 'PLD' || tankPosition === 'WAR' || tankPosition === 'DRK' || tankPosition === 'GNB') return 'MAIN_TANK';
  return 'PARTY';
}

/**
 * Convert a v1 plan payload into a base64-encoded Yjs PlanDoc state.
 *
 * @param {object} payload - the raw v1 plan JSON.
 * @param {object} [catalog] - { abilities, encounters, timelines }.
 *   `timelines` is an array of { encounterId, events: [{id,name,normalizedNames}] }.
 * @param {object} [options] - { planId } to force a specific `meta.id`
 *   (e.g. the deterministic UUID used by the migration, instead of the
 *   v1 firebase plan id which is not a valid UUID).
 * @returns {{ ydocB64: string, encounterId: string|null, report: object, parsed: object }}
 */
export function convertLegacyPlanToYDoc(
  payload,
  catalog = { abilities: [], encounters: [], timelines: [] },
  options = {},
) {
  const plan = parseLegacyPlan(payload);
  const cat = {
    abilities: catalog.abilities ?? [],
    encounters: catalog.encounters ?? [],
    timelines: catalog.timelines ?? [],
  };
  const encounterId =
    resolveEncounterId(plan.bossId, plan.selectedBossId, cat.encounters) ?? LEGACY_SENTINEL_ENCOUNTER_ID;
  const timelineEvents =
    (cat.timelines || []).find((t) => t.encounterId === encounterId)?.events ?? [];

  const report = {
    total: plan.assignments.length,
    matchedAbility: 0,
    matchedEvent: 0,
    unmatchedAbility: 0,
    unmatchedEvent: 0,
  };

  // Fixed clientID so the encoded state is byte-for-byte deterministic
  // (Yjs embeds a random clientID in the state vector otherwise), which
  // keeps re-running the import idempotent.
  const doc = new Y.Doc({ clientID: 0 });
  const meta = doc.getMap('meta');
  const docAssignments = doc.getMap('assignments');

  for (const a of plan.assignments) {
    const ability = resolveAbility(a.mitigationId, a.mitigationName, cat.abilities);
    const event = resolveEvent(a.bossActionId, timelineEvents);
    if (ability) report.matchedAbility += 1;
    else report.unmatchedAbility += 1;
    if (event) report.matchedEvent += 1;
    else report.unmatchedEvent += 1;

    const id = deterministicUuid(`assignment:${plan.ownerId ?? ''}:${a.bossActionId}:${a.mitigationId}:${a.chargeIndex ?? 0}`);
    const ts = a.assignedAt ? new Date(a.assignedAt).toISOString() : new Date().toISOString();

    const noteParts = ['Imported from MitPlan v1'];
    if (a.mitigationName) noteParts.push(`ability: ${a.mitigationName}`);
    else if (a.mitigationId) noteParts.push(`ability: ${a.mitigationId}`);
    if (a.bossActionId) noteParts.push(`event: ${a.bossActionId}`);
    if (a.tankPosition) noteParts.push(`tank: ${a.tankPosition}`);
    const m = a.raw && typeof a.raw === 'object' ? a.raw : {};
    if (m.duration != null) noteParts.push(`duration: ${m.duration}s`);
    if (m.cooldown != null) noteParts.push(`cooldown: ${m.cooldown}s`);

    const row = new Y.Map();
    row.set('id', id);
    row.set('abilityId', ability ? ability.id : deterministicUuid(`ability:${a.mitigationId ?? a.mitigationName ?? 'unknown'}`));
    row.set('targetUserId', null);
    row.set('targetType', targetTypeFor(a.tankPosition));
    row.set('eventId', event ? event.id : deterministicUuid(`event:${a.bossActionId}`));
    row.set('notes', noteParts.join(' · '));
    row.set('createdAt', ts);
    row.set('updatedAt', ts);
    row.set('revision', 0);
    row.set('legacyMitigationId', a.mitigationId);
    row.set('legacyMitigationName', a.mitigationName);
    row.set('legacyBossActionId', a.bossActionId);
    docAssignments.set(id, row);
  }

  meta.set('id', options.planId ?? plan.raw.id ?? deterministicUuid(`plan:${plan.title}`));
  meta.set('name', plan.title);
  meta.set('isLegacy', true);
  meta.set('legacyPlanId', plan.raw.id ?? null);
  meta.set('legacyBossId', plan.bossId);
  meta.set('legacySelectedBossId', plan.selectedBossId);
  meta.set('legacyOwnerId', plan.ownerId);
  meta.set('legacyVersion', plan.version);
  meta.set('legacyIsPublic', plan.isPublic);
  if (plan.createdAt) meta.set('legacyCreatedAt', new Date(plan.createdAt).toISOString());
  if (plan.updatedAt) meta.set('legacyUpdatedAt', new Date(plan.updatedAt).toISOString());
  if (plan.selectedJobs) meta.set('legacySelectedJobs', plan.selectedJobs);
  if (plan.tankPositions) meta.set('legacyTankPositions', plan.tankPositions);
  meta.set('legacyPayloadAvailable', true);
  meta.set('legacyPayload', plan.raw);
  // Deterministic import timestamp (from plan timestamps) so re-running
  // the import is idempotent and yields a stable Yjs state.
  const importTs = plan.updatedAt
    ? new Date(plan.updatedAt).toISOString()
    : plan.createdAt
      ? new Date(plan.createdAt).toISOString()
      : '2025-01-01T00:00:00.000Z';
  meta.set('importedAt', importTs);

  const ydocB64 = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
  doc.destroy();
  return { ydocB64, encounterId, report, parsed: plan };
}
