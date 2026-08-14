import { supabase } from '../config/supabase';
import { acquirePlanChannel } from './planRealtimeChannel';
import type {
  MitigationAssignments,
  Plan,
  PlanChange,
  PlanOperation,
  PlanWorkspaceSnapshot,
  UserPlanPreference,
} from '../types';
import { normalizePlanAbilityMode } from '../utils/abilities/abilityModeUtils';

const NORMALIZED_RPC_MISSING_CODES = new Set(['42883', 'PGRST202', 'PGRST204']);
const OUTBOX_DATABASE = 'mitplan-plan-outbox';
const OUTBOX_STORE = 'operations';

export interface QueuedPlanOperation {
  operationId: string;
  planId: string;
  baseRevision: number;
  operation: PlanOperation;
  queuedAt: number;
}

export interface WorkspaceSubscription {
  ready: Promise<void>;
  unsubscribe: () => Promise<void>;
}

export interface WorkspaceSubscriptionHandlers {
  onChange: (change: PlanChange & { afterData?: PlanWorkspaceSnapshot }) => void;
  onStatus?: (
    status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error',
    error?: Error
  ) => void;
}

const memoryOutbox = new Map<string, QueuedPlanOperation>();

const toError = (error: unknown, fallback: string): Error & { code?: string } => {
  if (error instanceof Error) {
    return error as Error & { code?: string };
  }

  const record = (error || {}) as { message?: string; code?: string };
  const nextError = new Error(record.message || fallback) as Error & { code?: string };
  nextError.code = record.code;
  return nextError;
};

export const isNormalizedRuntimeUnavailable = (error: unknown): boolean => {
  const candidate = error as { code?: string; message?: string };
  if (candidate?.code && NORMALIZED_RPC_MISSING_CODES.has(candidate.code)) {
    return true;
  }

  return /could not find the function|schema cache|load_plan_workspace|apply_plan_operation/i.test(
    candidate?.message || ''
  );
};

export const createOperationId = (): string => {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const normalizeWorkspace = (value: unknown): PlanWorkspaceSnapshot => {
  const workspace = value as PlanWorkspaceSnapshot | null;
  if (!workspace?.plan?.id) {
    throw new Error('The normalized plan workspace response is incomplete');
  }

  return {
    ...workspace,
    assignments: workspace.assignments || workspace.plan.assignments || {},
    revision: Number(workspace.revision ?? workspace.plan.revision ?? 0),
    partySlots: workspace.partySlots || [],
    changes: workspace.changes || [],
    permissions: workspace.permissions || {
      canRead: true,
      canEdit: workspace.plan.accessLevel !== 'viewer',
      canAdmin: workspace.plan.accessLevel === 'owner',
    },
    preference: workspace.preference || null,
    plan: {
      ...workspace.plan,
      mode: normalizePlanAbilityMode(workspace.plan.mode),
      snapshotCreatedAt:
        workspace.plan.snapshotCreatedAt ??
        (Number((workspace as unknown as Record<string, unknown>).snapshotCreatedAt || 0) || null),
      assignments: workspace.assignments || workspace.plan.assignments || {},
      revision: Number(workspace.revision ?? workspace.plan.revision ?? 0),
      schemaVersion: Number(workspace.plan.schemaVersion || 1),
    },
  };
};

export async function loadPlanWorkspace(
  planId: string,
  afterRevision: number | null = null
): Promise<PlanWorkspaceSnapshot> {
  let { data, error } = await supabase.rpc('load_plan_workspace_v2', {
    p_plan_id: planId,
    p_after_revision: afterRevision,
  });

  if (error && isNormalizedRuntimeUnavailable(error)) {
    ({ data, error } = await supabase.rpc('load_plan_workspace', {
      p_plan_id: planId,
      p_after_revision: afterRevision,
    }));
  }

  if (error) throw toError(error, 'Failed to load plan workspace');
  return normalizeWorkspace(data);
}

export async function createNormalizedPlan(plan: Partial<Plan>): Promise<PlanWorkspaceSnapshot> {
  let { data, error } = await supabase.rpc('create_normalized_plan_v2', {
    p_plan: plan,
  });

  if (error && isNormalizedRuntimeUnavailable(error)) {
    if (normalizePlanAbilityMode(plan.mode) !== 'CURRENT') {
      throw new Error('Evercold plan modes require the latest database migration');
    }
    ({ data, error } = await supabase.rpc('create_normalized_plan', {
      p_plan: plan,
    }));
  }

  if (error) throw toError(error, 'Failed to create plan');
  return normalizeWorkspace(data);
}

export async function listNormalizedPlans(): Promise<Plan[]> {
  let { data, error } = await supabase.rpc('list_normalized_plans_v2');
  if (error && isNormalizedRuntimeUnavailable(error)) {
    ({ data, error } = await supabase.rpc('list_normalized_plans'));
  }
  if (error) throw toError(error, 'Failed to list plans');
  return Array.isArray(data)
    ? data.map((plan) => ({
      ...plan as Plan,
      mode: normalizePlanAbilityMode((plan as Plan).mode),
    }))
    : [];
}

export async function deleteNormalizedPlan(planId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_normalized_plan', {
    p_plan_id: planId,
  });
  if (error) throw toError(error, 'Failed to delete plan');
  return data === true;
}

export async function applyPlanOperation(
  planId: string,
  operation: PlanOperation,
  baseRevision: number,
  operationId = createOperationId()
): Promise<PlanWorkspaceSnapshot> {
  const { data, error } = await supabase.rpc('apply_plan_operation', {
    p_plan_id: planId,
    p_operation_id: operationId,
    p_base_revision: baseRevision,
    p_operation: operation,
  });

  if (error) throw toError(error, 'Failed to update plan');
  return normalizeWorkspace(data);
}

export async function undoPlanChange(
  planId: string,
  changeId: string,
  operationId = createOperationId()
): Promise<PlanWorkspaceSnapshot> {
  const { data, error } = await supabase.rpc('undo_plan_change', {
    p_plan_id: planId,
    p_change_id: changeId,
    p_operation_id: operationId,
  });

  if (error) throw toError(error, 'Failed to undo plan change');
  return normalizeWorkspace(data);
}

export async function previewTimelineUpgrade(
  planId: string,
  targetVersionId: string
): Promise<{
  planId: string;
  targetVersionId: string;
  unchanged: string[];
  moved: string[];
  metadataChanged: string[];
  added: string[];
  removed: string[];
  ambiguous: string[];
}> {
  const { data, error } = await supabase.rpc('preview_timeline_upgrade', {
    p_plan_id: planId,
    p_target_version_id: targetVersionId,
  });
  if (error) throw toError(error, 'Failed to preview timeline upgrade');
  return data as {
    planId: string;
    targetVersionId: string;
    unchanged: string[];
    moved: string[];
    metadataChanged: string[];
    added: string[];
    removed: string[];
    ambiguous: string[];
  };
}

export async function listPublishedTimelineVersions(
  encounterKey: string
): Promise<Array<{
  id: string;
  timelineKey: string;
  versionLabel: string;
  gamePatch?: string | null;
  status: 'published';
  sourceType: string;
  routeIds: string[];
}>> {
  const { data, error } = await supabase.rpc('list_published_timeline_versions', {
    p_encounter_key: encounterKey,
  });
  if (error) throw toError(error, 'Failed to list published timeline versions');
  return Array.isArray(data) ? data : [];
}

export async function savePlanPreferences(
  planId: string,
  preferences: Partial<UserPlanPreference>
): Promise<UserPlanPreference> {
  const { data, error } = await supabase.rpc('save_plan_preferences', {
    p_plan_id: planId,
    p_preferences: preferences,
  });

  if (error) throw toError(error, 'Failed to save workspace preferences');
  return data as UserPlanPreference;
}

export async function createPlanShareLink(
  planId: string,
  expiresAt: string | null = null
): Promise<{ id: string; token: string; expiresAt: string | null }> {
  const { data, error } = await supabase.rpc('create_plan_share_link', {
    p_plan_id: planId,
    p_expires_at: expiresAt,
  });
  if (error) throw toError(error, 'Failed to create view link');
  return data as { id: string; token: string; expiresAt: string | null };
}

export async function revokePlanShareLinks(planId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('revoke_plan_share_links', {
    p_plan_id: planId,
  });
  if (error) throw toError(error, 'Failed to revoke view links');
  return data === true;
}

export async function getSharedPlan(token: string): Promise<PlanWorkspaceSnapshot> {
  let { data, error } = await supabase.rpc('get_shared_plan_v2', {
    p_token: token,
  });
  if (error && isNormalizedRuntimeUnavailable(error)) {
    ({ data, error } = await supabase.rpc('get_shared_plan', {
      p_token: token,
    }));
  }
  if (error) throw toError(error, 'Shared plan is unavailable');
  return normalizeWorkspace({
    ...(data as Record<string, unknown>),
    permissions: { canRead: true, canEdit: false, canAdmin: false },
    changes: [],
    preference: null,
  });
}

export async function createPlanInvite(
  planId: string,
  role: 'EDITOR' | 'VIEWER' = 'EDITOR',
  expiresAt: string | null = null
): Promise<{ id: string; token: string; role: string; expiresAt: string | null }> {
  const { data, error } = await supabase.rpc('create_plan_invite', {
    p_plan_id: planId,
    p_role: role,
    p_expires_at: expiresAt,
  });
  if (error) throw toError(error, 'Failed to create edit invite');
  return data as { id: string; token: string; role: string; expiresAt: string | null };
}

export async function revokePlanInvites(planId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('revoke_plan_invites', {
    p_plan_id: planId,
  });
  if (error) throw toError(error, 'Failed to revoke invites');
  return data === true;
}

export async function redeemPlanInvite(
  token: string
): Promise<{ planId: string; role: 'EDITOR' | 'VIEWER' }> {
  const { data, error } = await supabase.rpc('redeem_plan_invite', {
    p_token: token,
  });
  if (error) throw toError(error, 'Invite is unavailable');
  return data as { planId: string; role: 'EDITOR' | 'VIEWER' };
}

const extractBroadcastChange = (
  message: Record<string, unknown>
): (PlanChange & { afterData?: PlanWorkspaceSnapshot }) | null => {
  const payload = message.payload as Record<string, unknown> | undefined;
  const envelope = (
    payload?.record ||
    payload?.new ||
    message.record ||
    message.new ||
    message.payload ||
    message
  ) as Record<string, unknown>;

  const revision = Number(envelope.revision);
  if (!Number.isFinite(revision)) return null;

  return {
    id: String(envelope.id || ''),
    operationId: String(envelope.operation_id || envelope.operationId || ''),
    revision,
    baseRevision: envelope.base_revision == null
      ? null
      : Number(envelope.base_revision),
    actorId: String(envelope.actor_id || envelope.actorId || ''),
    operationKind: String(envelope.operation_kind || envelope.operationKind || 'patch_plan'),
    targetType: String(envelope.target_type || envelope.targetType || 'plan'),
    targetKey: envelope.target_key == null
      ? null
      : String(envelope.target_key),
    createdAt: String(envelope.created_at || envelope.createdAt || new Date().toISOString()),
    undoEligible: false,
    afterData: (envelope.after_data || envelope.afterData) as PlanWorkspaceSnapshot | undefined,
  };
};

export function subscribeToWorkspaceChanges(
  planId: string,
  handlers: WorkspaceSubscriptionHandlers
): WorkspaceSubscription {
  const sharedChannel = acquirePlanChannel(planId);
  handlers.onStatus?.('connecting');
  const removeChangeListener = sharedChannel.onChange((message) => {
    const change = extractBroadcastChange(message);
    if (change) handlers.onChange(change);
  });
  const removeStatusListener = sharedChannel.onStatus((status, error) => {
    if (status === 'SUBSCRIBED') handlers.onStatus?.('connected');
    else if (status === 'CLOSED') handlers.onStatus?.('disconnected');
    else if (status === 'error' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      handlers.onStatus?.('error', error || new Error('Realtime plan channel failed'));
    }
  });

  return {
    ready: sharedChannel.ready,
    unsubscribe: async () => {
      removeChangeListener();
      removeStatusListener();
      await sharedChannel.release();
    },
  };
}

const openOutbox = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = database.createObjectStore(OUTBOX_STORE, { keyPath: 'operationId' });
        store.createIndex('planId', 'planId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export async function queuePlanOperation(operation: QueuedPlanOperation): Promise<void> {
  memoryOutbox.set(operation.operationId, operation);
  const database = await openOutbox().catch(() => null);
  if (!database) return;

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(OUTBOX_STORE, 'readwrite');
    transaction.objectStore(OUTBOX_STORE).put(operation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function removeQueuedPlanOperation(operationId: string): Promise<void> {
  memoryOutbox.delete(operationId);
  const database = await openOutbox().catch(() => null);
  if (!database) return;

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(OUTBOX_STORE, 'readwrite');
    transaction.objectStore(OUTBOX_STORE).delete(operationId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function listQueuedPlanOperations(planId: string): Promise<QueuedPlanOperation[]> {
  const memoryOperations = Array.from(memoryOutbox.values()).filter(
    (operation) => operation.planId === planId
  );
  const database = await openOutbox().catch(() => null);
  if (!database) {
    return memoryOperations.sort((left, right) => left.queuedAt - right.queuedAt);
  }

  const persisted = await new Promise<QueuedPlanOperation[]>((resolve, reject) => {
    const transaction = database.transaction(OUTBOX_STORE, 'readonly');
    const index = transaction.objectStore(OUTBOX_STORE).index('planId');
    const request = index.getAll(planId);
    request.onsuccess = () => resolve(request.result as QueuedPlanOperation[]);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());

  const merged = new Map<string, QueuedPlanOperation>();
  [...persisted, ...memoryOperations].forEach((operation) => {
    merged.set(operation.operationId, operation);
  });
  return Array.from(merged.values()).sort((left, right) => left.queuedAt - right.queuedAt);
}

export function diffAssignmentEvents(
  previous: MitigationAssignments,
  next: MitigationAssignments
): MitigationAssignments {
  const changed: MitigationAssignments = {};
  const eventKeys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);

  eventKeys.forEach((eventKey) => {
    const previousValue = previous?.[eventKey] || [];
    const nextValue = next?.[eventKey] || [];
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      changed[eventKey] = nextValue;
    }
  });

  return changed;
}
