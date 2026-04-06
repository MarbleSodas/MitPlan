import type { Plan } from '../../types';

type PlanPermissionRecord = Pick<Plan, 'ownerId' | 'userId' | 'isPublic' | 'accessedBy'> & {
  hasAccessed?: boolean;
  accessInfo?: unknown;
};

function getPlanOwnerId(plan: PlanPermissionRecord | null | undefined): string | null {
  return plan?.ownerId || plan?.userId || null;
}

function hasTrackedSharedAccess(
  plan: PlanPermissionRecord | null | undefined,
  userId: string
): boolean {
  if (!plan || !userId) {
    return false;
  }

  if (plan.hasAccessed === true || plan.accessInfo != null) {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(plan.accessedBy || {}, userId);
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
  if (!plan || !userId) {
    return false;
  }

  if (canAdminPlan(plan, userId)) {
    return true;
  }

  if (plan.isPublic === true) {
    return true;
  }

  return hasTrackedSharedAccess(plan, userId);
}
