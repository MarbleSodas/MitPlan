/**
 * Plan Access Service
 * 
 * Access control, permissions, and user plan access tracking.
 */

import { getUserAccessiblePlans as fetchUserPlans, initializePlanOwnership, migratePlanOwnership, trackPlanAccess } from '../planAccessService';
import type { Plan } from '../../types';

// Re-export from planAccessService
export { initializePlanOwnership, migratePlanOwnership, trackPlanAccess } from '../planAccessService';

/**
 * Get all accessible plans for a user (owned + accessed + shared)
 */
export const getUserAccessiblePlans = async (userId: string): Promise<Plan[]> => {
  return fetchUserPlans(userId) as unknown as Promise<Plan[]>;
};
