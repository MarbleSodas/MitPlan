import type { Plan } from '../../types';

type PlanPermissionRecord = Pick<Plan, 'ownerId' | 'userId'>;

export function canAdminPlan(
  plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!plan || !userId) {
    return false;
  }

  return plan.ownerId === userId || plan.userId === userId;
}

export function canEditPlanContent(
  _plan: PlanPermissionRecord | null | undefined,
  userId: string | null | undefined
): boolean {
  return Boolean(userId);
}