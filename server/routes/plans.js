const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const { getConnection, r } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get user's plans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    const { folder_id, limit = 50, offset = 0 } = req.query;

    let query = r.db('mitplan_production')
      .table('plans')
      .getAll(req.user.id, { index: 'user_id' })
      .filter({ is_deleted: false });

    // Filter by folder if specified
    if (folder_id) {
      query = query.filter({ folder_id });
    }

    const plans = await query
      .orderBy(r.desc('updated_at'))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      .without('assignments') // Don't include full assignments in list view
      .run(connection);

    const plansArray = await plans.toArray();

    res.json({
      plans: plansArray,
      total: plansArray.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get plans'
    });
  }
});

// Create new plan
router.post('/', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Plan name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('boss_id')
    .notEmpty()
    .withMessage('Boss ID is required'),
  body('assignments')
    .isObject()
    .withMessage('Assignments must be an object'),
  body('selected_jobs')
    .isObject()
    .withMessage('Selected jobs must be an object'),
  body('folder_id')
    .optional()
    .isUUID()
    .withMessage('Folder ID must be a valid UUID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { 
      name, 
      description, 
      boss_id, 
      assignments, 
      selected_jobs, 
      tank_positions,
      folder_id 
    } = req.body;

    const connection = getConnection();
    const planId = uuidv4();

    const plan = {
      id: planId,
      user_id: req.user.id,
      name,
      description: description || '',
      boss_id,
      selected_jobs,
      assignments,
      tank_positions: tank_positions || {},
      is_public: false,
      is_deleted: false,
      folder_id: folder_id || null,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
      accessed_at: new Date()
    };

    await r.db('mitplan_production')
      .table('plans')
      .insert(plan)
      .run(connection);

    // Create initial version
    const version = {
      id: uuidv4(),
      plan_id: planId,
      version_number: 1,
      assignments,
      selected_jobs,
      tank_positions: tank_positions || {},
      created_at: new Date(),
      created_by: req.user.id
    };

    await r.db('mitplan_production')
      .table('plan_versions')
      .insert(version)
      .run(connection);

    res.status(201).json({
      message: 'Plan created successfully',
      plan: {
        id: planId,
        name,
        description,
        boss_id,
        version: 1,
        created_at: plan.created_at
      }
    });

  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create plan'
    });
  }
});

// Get specific plan
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const connection = getConnection();
    const plan = await r.db('mitplan_production')
      .table('plans')
      .get(req.params.id)
      .run(connection);

    if (!plan) {
      return res.status(404).json({
        error: 'Plan Not Found',
        message: 'Plan not found'
      });
    }

    // Check if user has access to this plan
    if (!plan.is_public && (!req.user || plan.user_id !== req.user.id)) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to view this plan'
      });
    }

    // Update accessed_at if user is authenticated and owns the plan
    if (req.user && plan.user_id === req.user.id) {
      await r.db('mitplan_production')
        .table('plans')
        .get(req.params.id)
        .update({ accessed_at: new Date() })
        .run(connection);
    }

    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        boss_id: plan.boss_id,
        selected_jobs: plan.selected_jobs,
        assignments: plan.assignments,
        tank_positions: plan.tank_positions,
        is_public: plan.is_public,
        version: plan.version,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        owner: req.user && plan.user_id === req.user.id
      }
    });

  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get plan'
    });
  }
});

// Update plan
router.put('/:id', [
  authenticateToken,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Plan name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('assignments')
    .optional()
    .isObject()
    .withMessage('Assignments must be an object'),
  body('selected_jobs')
    .optional()
    .isObject()
    .withMessage('Selected jobs must be an object'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const connection = getConnection();
    const plan = await r.db('mitplan_production')
      .table('plans')
      .get(req.params.id)
      .run(connection);

    if (!plan) {
      return res.status(404).json({
        error: 'Plan Not Found',
        message: 'Plan not found'
      });
    }

    if (plan.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to update this plan'
      });
    }

    const { 
      name, 
      description, 
      assignments, 
      selected_jobs, 
      tank_positions,
      is_public 
    } = req.body;

    const updateData = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_public !== undefined) updateData.is_public = is_public;

    // If assignments or selected_jobs are updated, increment version and create new version
    if (assignments !== undefined || selected_jobs !== undefined || tank_positions !== undefined) {
      updateData.version = plan.version + 1;
      if (assignments !== undefined) updateData.assignments = assignments;
      if (selected_jobs !== undefined) updateData.selected_jobs = selected_jobs;
      if (tank_positions !== undefined) updateData.tank_positions = tank_positions;

      // Create new version
      const version = {
        id: uuidv4(),
        plan_id: req.params.id,
        version_number: updateData.version,
        assignments: assignments || plan.assignments,
        selected_jobs: selected_jobs || plan.selected_jobs,
        tank_positions: tank_positions || plan.tank_positions,
        created_at: new Date(),
        created_by: req.user.id
      };

      await r.db('mitplan_production')
        .table('plan_versions')
        .insert(version)
        .run(connection);
    }

    const result = await r.db('mitplan_production')
      .table('plans')
      .get(req.params.id)
      .update(updateData, { returnChanges: true })
      .run(connection);

    const updatedPlan = result.changes[0].new_val;

    res.json({
      message: 'Plan updated successfully',
      plan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        description: updatedPlan.description,
        version: updatedPlan.version,
        updated_at: updatedPlan.updated_at
      }
    });

  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update plan'
    });
  }
});

module.exports = router;
