import express from 'express';
import { body } from 'express-validator';
import * as planController from '../controllers/planController.js';
import { authenticate, isVerified, hasPlanAccess, hasEditAccess, isPlanOwner } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/plans
 * @desc Create a new plan
 * @access Private
 */
router.post(
  '/',
  authenticate,
  isVerified,
  [
    body('title').isString().withMessage('Title must be a string'),
    body('bossId').isString().withMessage('Boss ID must be a string'),
    body('selectedJobs').isArray().withMessage('Selected jobs must be an array')
  ],
  planController.createPlan
);

/**
 * @route GET /api/plans/user
 * @desc Get all plans for current user
 * @access Private
 */
router.get('/user', authenticate, planController.getUserPlans);

/**
 * @route GET /api/plans/shared
 * @desc Get plans shared with current user
 * @access Private
 */
router.get('/shared', authenticate, planController.getSharedPlans);

/**
 * @route GET /api/plans/public
 * @desc Get public plans
 * @access Public
 */
router.get('/public', planController.getPublicPlans);

/**
 * @route GET /api/plans/:id
 * @desc Get a plan by ID
 * @access Private
 */
router.get('/:id', authenticate, hasPlanAccess, planController.getPlan);

/**
 * @route PUT /api/plans/:id
 * @desc Update a plan
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  isVerified,
  hasEditAccess,
  [
    body('title').isString().optional().withMessage('Title must be a string'),
    body('bossId').isString().optional().withMessage('Boss ID must be a string'),
    body('selectedJobs').isArray().optional().withMessage('Selected jobs must be an array')
  ],
  planController.updatePlan
);

/**
 * @route DELETE /api/plans/:id
 * @desc Delete a plan
 * @access Private
 */
router.delete('/:id', authenticate, isPlanOwner, planController.deletePlan);

/**
 * @route POST /api/plans/:id/share
 * @desc Share a plan with a user
 * @access Private
 */
router.post(
  '/:id/share',
  authenticate,
  isVerified,
  isPlanOwner,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('permissions').isObject().withMessage('Permissions must be an object'),
    body('permissions.canEdit').isBoolean().withMessage('canEdit must be a boolean')
  ],
  planController.sharePlan
);

/**
 * @route DELETE /api/plans/:id/share/:userId
 * @desc Remove sharing for a user
 * @access Private
 */
router.delete('/:id/share/:userId', authenticate, isPlanOwner, planController.removeSharing);

/**
 * @route GET /api/plans/:id/versions
 * @desc Get plan versions
 * @access Private
 */
router.get('/:id/versions', authenticate, hasPlanAccess, planController.getPlanVersions);

/**
 * @route GET /api/plans/:id/versions/:version
 * @desc Get a specific plan version
 * @access Private
 */
router.get('/:id/versions/:version', authenticate, hasPlanAccess, planController.getPlanVersion);

/**
 * @route GET /api/plans/:id/compare
 * @desc Compare two plan versions
 * @access Private
 */
router.get('/:id/compare', authenticate, hasPlanAccess, planController.comparePlanVersions);

/**
 * @route POST /api/plans/:id/link
 * @desc Create a shareable link for a plan
 * @access Private
 */
router.post('/:id/link', authenticate, isPlanOwner, planController.createShareableLink);

/**
 * @route GET /api/plans/share/:token
 * @desc Get a plan by shareable link
 * @access Public
 */
router.get('/share/:token', planController.getPlanByShareableLink);

export default router;