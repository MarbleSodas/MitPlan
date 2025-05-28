const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const { getConnection, r } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's folders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();
    
    const folders = await r.db('mitplan_production')
      .table('folders')
      .getAll(req.user.id, { index: 'user_id' })
      .orderBy('name')
      .run(connection);

    const foldersArray = await folders.toArray();

    res.json({
      folders: foldersArray
    });

  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get folders'
    });
  }
});

// Create new folder
router.post('/', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Folder name must be between 1 and 50 characters'),
  body('parent_folder_id')
    .optional()
    .isUUID()
    .withMessage('Parent folder ID must be a valid UUID')
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

    const { name, parent_folder_id } = req.body;
    const connection = getConnection();

    // Check if parent folder exists and belongs to user
    if (parent_folder_id) {
      const parentFolder = await r.db('mitplan_production')
        .table('folders')
        .get(parent_folder_id)
        .run(connection);

      if (!parentFolder || parentFolder.user_id !== req.user.id) {
        return res.status(400).json({
          error: 'Invalid Parent Folder',
          message: 'Parent folder not found or access denied'
        });
      }
    }

    const folderId = uuidv4();
    const folder = {
      id: folderId,
      user_id: req.user.id,
      name,
      parent_folder_id: parent_folder_id || null,
      created_at: new Date()
    };

    await r.db('mitplan_production')
      .table('folders')
      .insert(folder)
      .run(connection);

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folderId,
        name,
        parent_folder_id: parent_folder_id || null,
        created_at: folder.created_at
      }
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create folder'
    });
  }
});

// Update folder
router.put('/:id', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Folder name must be between 1 and 50 characters')
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

    const { name } = req.body;
    const connection = getConnection();

    const folder = await r.db('mitplan_production')
      .table('folders')
      .get(req.params.id)
      .run(connection);

    if (!folder) {
      return res.status(404).json({
        error: 'Folder Not Found',
        message: 'Folder not found'
      });
    }

    if (folder.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to update this folder'
      });
    }

    const result = await r.db('mitplan_production')
      .table('folders')
      .get(req.params.id)
      .update({ name }, { returnChanges: true })
      .run(connection);

    const updatedFolder = result.changes[0].new_val;

    res.json({
      message: 'Folder updated successfully',
      folder: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        parent_folder_id: updatedFolder.parent_folder_id,
        created_at: updatedFolder.created_at
      }
    });

  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update folder'
    });
  }
});

// Delete folder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = getConnection();

    const folder = await r.db('mitplan_production')
      .table('folders')
      .get(req.params.id)
      .run(connection);

    if (!folder) {
      return res.status(404).json({
        error: 'Folder Not Found',
        message: 'Folder not found'
      });
    }

    if (folder.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to delete this folder'
      });
    }

    // Check if folder has subfolders
    const subfolders = await r.db('mitplan_production')
      .table('folders')
      .getAll(req.params.id, { index: 'parent_folder_id' })
      .count()
      .run(connection);

    if (subfolders > 0) {
      return res.status(400).json({
        error: 'Folder Not Empty',
        message: 'Cannot delete folder that contains subfolders'
      });
    }

    // Check if folder has plans
    const plans = await r.db('mitplan_production')
      .table('plans')
      .filter({ folder_id: req.params.id, is_deleted: false })
      .count()
      .run(connection);

    if (plans > 0) {
      return res.status(400).json({
        error: 'Folder Not Empty',
        message: 'Cannot delete folder that contains plans'
      });
    }

    await r.db('mitplan_production')
      .table('folders')
      .get(req.params.id)
      .delete()
      .run(connection);

    res.json({
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete folder'
    });
  }
});

module.exports = router;
