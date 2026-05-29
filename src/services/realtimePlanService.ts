/**
 * Real-time Plan Service
 * 
 * This module has been refactored into smaller, focused modules.
 * All functionality has been moved to src/services/plans/
 * 
 * This file re-exports all functionality for backward compatibility.
 * 
 * @deprecated Use imports from 'src/services/plans/' directly for new code.
 */

// Re-export everything from the new plans module for backward compatibility
export * from './plans';

// Import all exports with specific names for explicit backward compatibility
import * as PlansModule from './plans';

// Mark all re-exports as deprecated
// Components should migrate to importing from './plans' directly

/**
 * @deprecated Import from './plans' directly
 */
export const createPlan = PlansModule.createPlan;

/**
 * @deprecated Import from './plans' directly
 */
export const getPlan = PlansModule.getPlan;

/**
 * @deprecated Import from './plans' directly
 */
export const updatePlan = PlansModule.updatePlan;

/**
 * @deprecated Import from './plans' directly
 */
export const deletePlan = PlansModule.deletePlan;

/**
 * @deprecated Import from './plans' directly
 */
export const subscribeToPlan = PlansModule.subscribeToPlan;

/**
 * @deprecated Import from './plans' directly
 */
export const subscribeToUserPlans = PlansModule.subscribeToUserPlans;

/**
 * @deprecated Import from './plans' directly
 */
export const updatePlanFieldsWithOrigin = PlansModule.updatePlanFieldsWithOrigin;

/**
 * @deprecated Import from './plans' directly
 */
export const enablePlanShareView = PlansModule.enablePlanShareView;

/**
 * @deprecated Import from './plans' directly
 */
export const revokePlanShareView = PlansModule.revokePlanShareView;

// ... etc for all other exports
// For now, the star export above handles backward compatibility
