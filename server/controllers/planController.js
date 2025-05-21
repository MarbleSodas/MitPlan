import Plan from '../models/Plan.js';
import Version from '../models/Version.js';
import User from '../models/User.js';
import { sendPlanSharingEmail } from '../services/emailService.js';
import { validationResult } from 'express-validator';

/**
 * Create a new plan
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createPlan = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, description, bossId, selectedJobs, assignments, isPublic } = req.body;
    const userId = req.user.id;
    
    // Create plan
    const plan = await Plan.create({
      title,
      description,
      bossId,
      selectedJobs,
      assignments,
      userId,
      isPublic: isPublic || false
    });
    
    res.status(201).json({
      message: 'Plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all plans for current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getUserPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's plans
    const plans = await Plan.findByUserId(userId);
    
    res.json({ plans });
  } catch (error) {
    console.error('Get user plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get plans shared with current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getSharedPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get shared plans
    const plans = await Plan.findSharedWithUser(userId);
    
    res.json({ plans });
  } catch (error) {
    console.error('Get shared plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get public plans
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPublicPlans = async (req, res) => {
  try {
    // Get public plans
    const plans = await Plan.findPublicPlans();
    
    res.json({ plans });
  } catch (error) {
    console.error('Get public plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a plan by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPlan = async (req, res) => {
  try {
    // Plan is already attached to request by middleware
    res.json({ plan: req.plan });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a plan
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updatePlan = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { title, description, bossId, selectedJobs, assignments, isPublic } = req.body;
    const userId = req.user.id;
    
    // Update plan
    const plan = await Plan.update(id, {
      title,
      description,
      bossId,
      selectedJobs,
      assignments,
      isPublic
    }, userId);
    
    res.json({
      message: 'Plan updated successfully',
      plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a plan
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Delete plan
    await Plan.delete(id, userId);
    
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Share a plan with a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const sharePlan = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { email, permissions } = req.body;
    const ownerId = req.user.id;
    
    // Find user by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is the owner
    if (user.id === ownerId) {
      return res.status(400).json({ message: 'Cannot share plan with yourself' });
    }
    
    // Share plan
    const plan = await Plan.sharePlan(id, ownerId, user.id, permissions);
    
    // Send email notification
    await sendPlanSharingEmail(user.email, plan, req.user);
    
    res.json({
      message: 'Plan shared successfully',
      plan
    });
  } catch (error) {
    console.error('Share plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove sharing for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const removeSharing = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const ownerId = req.user.id;
    
    // Remove sharing
    const plan = await Plan.removeSharing(id, ownerId, userId);
    
    res.json({
      message: 'Sharing removed successfully',
      plan
    });
  } catch (error) {
    console.error('Remove sharing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get plan versions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPlanVersions = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get versions
    const versions = await Version.getVersions(id);
    
    res.json({ versions });
  } catch (error) {
    console.error('Get plan versions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a specific plan version
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPlanVersion = async (req, res) => {
  try {
    const { id, version } = req.params;
    
    // Get version
    const versionData = await Version.getVersion(id, version);
    
    if (!versionData) {
      return res.status(404).json({ message: 'Version not found' });
    }
    
    res.json({ version: versionData });
  } catch (error) {
    console.error('Get plan version error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Compare two plan versions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const comparePlanVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const { version1, version2 } = req.query;
    
    if (!version1 || !version2) {
      return res.status(400).json({ message: 'Both version1 and version2 are required' });
    }
    
    // Compare versions
    const comparison = await Version.compareVersions(id, version1, version2);
    
    res.json({ comparison });
  } catch (error) {
    console.error('Compare plan versions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a shareable link for a plan
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createShareableLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresAt, isViewOnly } = req.body;
    const userId = req.user.id;
    
    // Create link
    const link = await Plan.createShareableLink(id, userId, {
      expiresAt,
      isViewOnly
    });
    
    res.json({
      message: 'Shareable link created successfully',
      link
    });
  } catch (error) {
    console.error('Create shareable link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a plan by shareable link
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPlanByShareableLink = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Get plan
    const plan = await Plan.findByShareableLink(token);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found or link expired' });
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Get plan by shareable link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  createPlan,
  getUserPlans,
  getSharedPlans,
  getPublicPlans,
  getPlan,
  updatePlan,
  deletePlan,
  sharePlan,
  removeSharing,
  getPlanVersions,
  getPlanVersion,
  comparePlanVersions,
  createShareableLink,
  getPlanByShareableLink
};