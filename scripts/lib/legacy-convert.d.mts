export interface LegacyAssignment {
  bossActionId: string;
  mitigationId: string;
  mitigationName: string;
  tankPosition: string | null;
  assignedAt?: number;
  assignedBy?: string;
  chargeIndex?: number;
  raw?: Record<string, unknown>;
}

export interface ParsedLegacyPlan {
  id: string;
  title: string;
  bossId: string;
  selectedBossId: string | null;
  ownerId: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  version: number | null;
  isPublic: boolean;
  selectedJobs: Record<string, string[]> | null;
  tankPositions: Record<string, string> | null;
  assignments: LegacyAssignment[];
  raw: Record<string, unknown>;
}

export interface LegacyCatalog {
  abilities?: Array<{ id: string; abilityId: string; name: string }>;
  encounters?: Array<{ id: string; slug?: string; name: string }>;
  timelines?: Array<{ encounterId: string; events: Array<{ id: string; name?: string; normalizedNames?: string[] }> }>;
}

export interface LegacyConvertReport {
  total: number;
  matchedAbility: number;
  matchedEvent: number;
  unmatchedAbility: number;
  unmatchedEvent: number;
}

export const LEGACY_SENTINEL_ENCOUNTER_ID = '00000000-0000-0000-0000-000000000003';

export function parseLegacyPlan(payload: Record<string, unknown>): ParsedLegacyPlan;
export function actionNameOf(bossActionId: string): string;
export function resolveEncounterId(
  bossId: string,
  selectedBossId: string | null,
  encounters: LegacyCatalog['encounters'],
): string | null;
export function resolveAbility(
  mitigationId: string,
  mitigationName: string,
  abilities: LegacyCatalog['abilities'],
): { id: string; abilityId: string; name: string } | null;
export function resolveEvent(
  bossActionId: string,
  events: Array<{ id: string; name?: string; normalizedNames?: string[] }>,
): { id: string; name?: string; normalizedNames?: string[] } | null;
export function convertLegacyPlanToYDoc(
  payload: Record<string, unknown>,
  catalog?: LegacyCatalog,
  options?: { planId?: string },
): { ydocB64: string; encounterId: string | null; report: LegacyConvertReport; parsed: ParsedLegacyPlan };
