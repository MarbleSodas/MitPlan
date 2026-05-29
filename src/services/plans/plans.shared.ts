/**
 * Shared Plan Utilities
 * 
 * Normalization and transformation utilities that don't depend on Firebase.
 * These can be imported without Firebase side effects.
 */

import {
  getPlanTimelineLayout,
  getPlanTimelineMirrorFields,
  normalizePlanTimelineLayout,
} from '../../utils/timeline/planTimelineLayoutUtils';
import { BOSS_DISPLAY_NAMES } from '../../data/bosses';

// ============================================================================
// Constants
// ============================================================================

/**
 * Current plan schema version
 */
export const CURRENT_PLAN_VERSION = 4.1;

export const PLANS_PATH = 'plans';
export const PLAN_SHARE_VIEWS_PATH = 'planShareViews';
export const PLAN_SHARE_VIEW_TRACKING_PATH = 'planShareViewTracking';
export const PLAN_COLLABORATIONS_BY_USER_PATH = 'planCollaborationsByUser';
export const USER_PROFILES_PATH = 'userProfiles';

// ============================================================================
// Boss Utilities
// ============================================================================

/**
 * Get display name for a boss ID
 */
export const getBossName = (bossId: string): string => {
  return BOSS_DISPLAY_NAMES[bossId] || 'Unknown Boss';
};

/**
 * Get the canonical boss ID from plan data
 */
export const getCanonicalBossId = (planData: Record<string, unknown> = {}): string => {
  return (planData.timelineLayout as { bossId?: string } | null)?.bossId 
    || (planData.bossId as string | undefined) 
    || (planData.selectedBoss as { id?: string })?.id 
    || 'ketuduke';
};

// ============================================================================
// Firebase Value Utilities
// ============================================================================

/**
 * Sanitize a value for Firebase storage, removing undefined values
 */
export const sanitizeFirebaseValue = <T>(value: T): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .map((entry) => sanitizeFirebaseValue(entry))
      .filter((entry) => entry !== undefined);
    return sanitized as unknown as T;
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, entryValue]) => {
      const sanitizedEntryValue = sanitizeFirebaseValue(entryValue);
      if (sanitizedEntryValue !== undefined) {
        result[key] = sanitizedEntryValue;
      }
    });
    return result as unknown as T;
  }

  return value;
};

// ============================================================================
// Timeline Layout Utilities
// ============================================================================

/**
 * Add timeline layout mirror fields to plan data
 */
export const withTimelineLayoutMirrors = (planData: Record<string, unknown> = {}): Record<string, unknown> => {
  if (!planData.timelineLayout) {
    return planData;
  }

  const timelineLayout = normalizePlanTimelineLayout(planData.timelineLayout as Parameters<typeof normalizePlanTimelineLayout>[0]);
  if (!timelineLayout) {
    return {
      ...planData,
      timelineLayout: null,
    };
  }

  return {
    ...planData,
    ...getPlanTimelineMirrorFields(timelineLayout),
  };
};

/**
 * Build plan field payload with timeline layout mirrors
 */
export const buildPlanFieldPayload = (planData: Record<string, unknown> = {}): Record<string, unknown> => {
  return withTimelineLayoutMirrors(planData);
};

// ============================================================================
// Field Mapping Utilities
// ============================================================================

/**
 * Get canonical field path for legacy field names
 */
export const getCanonicalPlanField = (fieldPath: string, value: unknown): [string, unknown] => {
  switch (fieldPath) {
    case 'title':
      return ['name', value];
    case 'selectedBoss':
      return ['bossId', typeof value === 'object' ? (value as { id?: string })?.id || 'ketuduke' : value];
    case 'assignedMitigations':
      return ['assignments', value];
    case 'tankAssignments':
      return ['tankPositions', value];
    default:
      return [fieldPath, value];
  }
};

// ============================================================================
// Ownership & Access Utilities
// ============================================================================

/**
 * Get the owner ID from plan data
 */
export const getPlanOwnerId = (planData: Record<string, unknown> = {}): string | null => {
  return (planData.ownerId as string | null) || (planData.userId as string | null) || null;
};

/**
 * Get the collaborator map from plan data
 */
export const getCollaboratorMap = (planData: Record<string, unknown> = {}): Record<string, unknown> => {
  const collaborators = planData.collaborators;
  if (collaborators && typeof collaborators === 'object') {
    return collaborators as Record<string, unknown>;
  }
  return {};
};

/**
 * Get share settings from plan data
 */
export const getShareSettings = (planData: Record<string, unknown> = {}): PlanShareSettings => {
  const shareSettings = planData.shareSettings as PlanShareSettings | undefined;
  if (!shareSettings || typeof shareSettings !== 'object') {
    return {
      viewToken: null,
      viewEnabled: false,
      viewUpdatedAt: null,
    };
  }

  return {
    viewToken: shareSettings.viewToken || null,
    viewEnabled: shareSettings.viewEnabled === true,
    viewUpdatedAt: shareSettings.viewUpdatedAt || null,
  };
};

export interface PlanShareSettings {
  viewToken: string | null;
  viewEnabled: boolean;
  viewUpdatedAt: number | null;
}

/**
 * Get access level from plan data for a user
 */
export const getAccessLevelFromPlan = (planData: Record<string, unknown> = {}, userId: string | null = null): 'owner' | 'editor' | null => {
  if (!userId) {
    return null;
  }

  if (getPlanOwnerId(planData) === userId) {
    return 'owner';
  }

  if (planData.isPublic === true) {
    return 'editor';
  }

  const collaboratorMap = getCollaboratorMap(planData);
  if (collaboratorMap[userId] && (collaboratorMap[userId] as { role?: string })?.role === 'editor') {
    return 'editor';
  }

  return null;
};

// ============================================================================
// Token Utilities
// ============================================================================

/**
 * Create a random token for share links
 */
export const createRandomToken = (): string => {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const bytes = new Uint8Array(24);
    cryptoObject.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
};

// ============================================================================
// Types
// ============================================================================

export interface NormalizedPlanRecord {
  id: string;
  name: string;
  description: string;
  bossId: string;
  selectedJobs: Record<string, unknown>;
  assignments: Record<string, unknown>;
  tankPositions: { mainTank: string | null; offTank: string | null };
  healthSettings: Record<string, unknown>;
  isPublic: boolean;
  userId: string | null;
  ownerId: string | null;
  accessedBy: Record<string, unknown>;
  collaborators: Record<string, unknown>;
  shareSettings: PlanShareSettings;
  createdAt: number | undefined;
  updatedAt: number | undefined;
  lastAccessedAt: number | undefined;
  version: number;
  lastModifiedBy: string | null;
  lastChangeOrigin: string | null;
  sourceTimelineId: string | null;
  sourceTimelineName: string | null;
  phaseOverrides: Record<string, unknown>;
  bossTags: string[];
  bossMetadata: unknown;
  timelineLayout: unknown;
  accessLevel: 'owner' | 'editor' | 'viewer' | null;
  shareMode: 'owned' | 'edit' | 'view';
  viewToken: string | null;
}

// ============================================================================
// Share View Utilities
// ============================================================================

/**
 * Build share view payload for snapshot storage
 */
export const buildShareViewPayload = (
  planId: string,
  planData: Record<string, unknown> = {},
  overrides: {
    snapshotCreatedAt?: number;
    sourcePlanUpdatedAt?: number;
    viewEnabled?: boolean;
    viewToken?: string;
  } = {}
): Record<string, unknown> => {
  const normalizedPlan = normalizePlanRecord(planId, planData);
  const shareSettings = getShareSettings(planData);
  const snapshotCreatedAt = overrides.snapshotCreatedAt ?? Date.now();
  const sourcePlanUpdatedAt = overrides.sourcePlanUpdatedAt ?? (normalizedPlan.updatedAt as number | undefined) ?? snapshotCreatedAt;

  return sanitizeFirebaseValue({
    planId,
    ownerId: normalizedPlan.ownerId || null,
    name: normalizedPlan.name,
    description: normalizedPlan.description || '',
    bossId: normalizedPlan.bossId,
    selectedJobs: normalizedPlan.selectedJobs || {},
    assignments: normalizedPlan.assignments || {},
    tankPositions: normalizedPlan.tankPositions || {
      mainTank: null,
      offTank: null,
    },
    healthSettings: normalizedPlan.healthSettings || {},
    sourceTimelineId: normalizedPlan.sourceTimelineId || null,
    sourceTimelineName: normalizedPlan.sourceTimelineName || null,
    phaseOverrides: normalizedPlan.phaseOverrides || {},
    bossTags: normalizedPlan.bossTags || [],
    bossMetadata: normalizedPlan.bossMetadata || null,
    timelineLayout: normalizedPlan.timelineLayout || null,
    viewEnabled: overrides.viewEnabled ?? shareSettings.viewEnabled,
    updatedAt: snapshotCreatedAt,
    snapshotCreatedAt,
    sourcePlanUpdatedAt,
  }) as Record<string, unknown>;
};

/**
 * Build view-only plan record from share view data
 */
export const buildViewOnlyPlanRecord = (viewToken: string, viewData: Record<string, unknown> = {}): NormalizedPlanRecord => {
  const timelineLayout = getPlanTimelineLayout(viewData);
  const bossId = getCanonicalBossId(viewData);

  const id = (viewData.planId as string) || viewToken;
  const sourceTimelineId = (viewData.sourceTimelineId as string) || null;
  const sourceTimelineName = (viewData.sourceTimelineName as string) || null;
  const phaseOverrides = (viewData.phaseOverrides as Record<string, unknown>) || {};
  const bossTags = (timelineLayout as { bossTags?: string[] } | null)?.bossTags || (viewData.bossTags as string[]) || (bossId ? [bossId] : []);
  const bossMetadata = (timelineLayout as { bossMetadata?: unknown } | null)?.bossMetadata || (viewData.bossMetadata as unknown) || null;
  const updatedAt = (viewData.sourcePlanUpdatedAt as number) || (viewData.updatedAt as number) || undefined;

  return {
    id,
    name: (viewData.name as string) || 'Untitled Plan',
    description: (viewData.description as string) || '',
    bossId: (timelineLayout as { bossId?: string } | null)?.bossId || bossId,
    selectedJobs: (viewData.selectedJobs as Record<string, unknown>) || {},
    assignments: (viewData.assignments as Record<string, unknown>) || {},
    tankPositions: (viewData.tankPositions as { mainTank: string | null; offTank: string | null }) || {
      mainTank: null,
      offTank: null,
    },
    healthSettings: (viewData.healthSettings as Record<string, unknown>) || {},
    sourceTimelineId,
    sourceTimelineName,
    phaseOverrides,
    bossTags,
    bossMetadata,
    timelineLayout,
    ownerId: (viewData.ownerId as string) || null,
    userId: (viewData.ownerId as string) || null,
    createdAt: viewData.createdAt as number | undefined,
    updatedAt,
    lastAccessedAt: undefined,
    version: CURRENT_PLAN_VERSION,
    lastModifiedBy: null,
    lastChangeOrigin: null,
    isPublic: false,
    accessedBy: {},
    collaborators: {},
    shareSettings: {
      viewToken,
      viewEnabled: viewData.viewEnabled === true,
      viewUpdatedAt: (viewData.updatedAt as number) || null,
    },
    accessLevel: 'viewer',
    shareMode: 'view',
    viewToken,
  };
};

// ============================================================================
// Plan Normalization
// ============================================================================

/**
 * Normalize a plan record to ensure all fields have proper defaults
 */
export const normalizePlanRecord = (planId: string | null, planData: Record<string, unknown> = {}): NormalizedPlanRecord => {
  const planFields = buildPlanFieldPayload(planData);
  const timelineLayout = getPlanTimelineLayout(planFields);
  const bossId = getCanonicalBossId(planFields);
  const ownerId = getPlanOwnerId(planFields);
  const collaborators = getCollaboratorMap(planFields);
  const shareSettings = getShareSettings(planFields);
  const accessLevel = (planFields.accessLevel as 'owner' | 'editor' | 'viewer' | null) || getAccessLevelFromPlan(planFields, (planFields.currentUserId as string | undefined) || null);

  const isEditorAccess = accessLevel === 'owner' || accessLevel === 'editor' || planFields.isPublic === true;

  return {
    id: planId || '',
    name: (planFields.name as string) || (planFields.title as string) || 'Untitled Plan',
    description: (planFields.description as string) || '',
    bossId: (timelineLayout as { bossId?: string } | null)?.bossId || bossId,
    selectedJobs: (planFields.selectedJobs as Record<string, unknown>) || {},
    assignments: (planFields.assignments as Record<string, unknown>) || (planFields.assignedMitigations as Record<string, unknown>) || {},
    tankPositions: (planFields.tankPositions as { mainTank: string | null; offTank: string | null }) || (planFields.tankAssignments as { mainTank: string | null; offTank: string | null }) || {
      mainTank: null,
      offTank: null,
    },
    healthSettings: (planFields.healthSettings as Record<string, unknown>) || {},
    isPublic: (planFields.isPublic as boolean) || false,
    userId: ownerId,
    ownerId,
    accessedBy: (planFields.accessedBy as Record<string, unknown>) || {},
    collaborators,
    shareSettings,
    createdAt: planFields.createdAt as number | undefined,
    updatedAt: planFields.updatedAt as number | undefined,
    lastAccessedAt: planFields.lastAccessedAt as number | undefined,
    version: (planFields.version as number) || CURRENT_PLAN_VERSION,
    lastModifiedBy: (planFields.lastModifiedBy as string) || null,
    lastChangeOrigin: (planFields.lastChangeOrigin as string) || null,
    sourceTimelineId: (planFields.sourceTimelineId as string) || null,
    sourceTimelineName: (planFields.sourceTimelineName as string) || null,
    phaseOverrides: (planFields.phaseOverrides as Record<string, unknown>) || {},
    bossTags: (timelineLayout as { bossTags?: string[] } | null)?.bossTags || (planFields.bossTags as string[]) || (bossId ? [bossId] : []),
    bossMetadata: (timelineLayout as { bossMetadata?: unknown } | null)?.bossMetadata || (planFields.bossMetadata as unknown) || null,
    timelineLayout,
    accessLevel,
    shareMode: (planFields.shareMode as 'owned' | 'edit' | 'view') || (isEditorAccess ? 'edit' : 'owned'),
    viewToken: (planFields.viewToken as string) || shareSettings.viewToken || null,
  };
};

/**
 * Build plan updates payload for Firebase
 */
export const buildPlanUpdates = (
  planId: string,
  planData: Record<string, unknown>,
  userId: string | null = null,
  sessionId: string | null = null
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  const expandedPlanData = buildPlanFieldPayload(planData);

  Object.entries(expandedPlanData).forEach(([fieldPath, value]) => {
    const [canonicalFieldPath, canonicalValue] = getCanonicalPlanField(fieldPath, value);
    const sanitizedValue = sanitizeFirebaseValue(canonicalValue);
    if (sanitizedValue !== undefined) {
      updates[`${PLANS_PATH}/${planId}/${canonicalFieldPath}`] = sanitizedValue;
    }
  });

  updates[`${PLANS_PATH}/${planId}/updatedAt`] = serverTimestamp();

  if (userId) {
    updates[`${PLANS_PATH}/${planId}/lastModifiedBy`] = userId;
  }

  if (sessionId) {
    updates[`${PLANS_PATH}/${planId}/lastChangeOrigin`] = sessionId;
  }

  return updates;
};

// Import serverTimestamp from Firebase (needed for buildPlanUpdates)
// This is the only Firebase import in this shared module
import { serverTimestamp } from 'firebase/database';
