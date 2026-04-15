import type { Plan, PlanAccessLevel } from '../../types';

type PlanPermissionRecord = Pick<
  Plan,
  'ownerId' | 'userId' | 'isPublic' | 'accessedBy' | 'collaborators' | 'accessLevel' | 'shareMode'
> & {
  hasAccessed?: boolean;
  accessInfo?: unknown;
};

function getPlanOwnerId(plan: PlanPermissionRecord | null | undefined): string | null {
  return plan?.ownerId || plan?.userId || null;
}

function isPlanCollaborator(
  plan: PlanPermissionRecord | null | undefined,
  userId: string
): boolean {
  if (!plan || !userId) {
    return false;
  }

  return plan.collaborators?.[userId]?.role === 'editor';
}

function hasTrackedSharedAccess(
  plan: PlanPermissionRecord | null | undefined,
  userId: string
): boolean {
  if (!plan || !userId) {
    return false;
  }

  if (plan.accessLevel === 'viewer' || plan.shareMode === 'view') {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(plan.accessedBy || {}, userId);
}

export function getPlanAccessLevel(
  plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): PlanAccessLevel | null {
  if (!plan || !userId) {
    return null;
  }

  if (getPlanOwnerId(plan) === userId) {
    return 'owner';
  }

  if (isPlanCollaborator(plan, userId)) {
    return 'editor';
  }

  if (plan.isPublic === true) {
    return 'editor';
  }

  if (hasTrackedSharedAccess(plan, userId)) {
    return 'viewer';
  }

  return null;
}

export function canAdminPlan(
  plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!plan || !userId) {
    return false;
  }

  return getPlanOwnerId(plan) === userId;
}

export function canEditPlanContent(
  plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): boolean {
  const accessLevel = getPlanAccessLevel(plan, userId);
  return accessLevel === 'owner' || accessLevel === 'editor';
}

export function canViewPlan(
  plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): boolean {
  return getPlanAccessLevel(plan, userId) !== null;
}
