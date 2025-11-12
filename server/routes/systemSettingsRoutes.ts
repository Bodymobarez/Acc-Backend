import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// @route   GET /api/system-settings
// @desc    Get all system settings
// @access  Private (Admin)
router.get(
  '/',
  authenticate,
  requirePermission('viewSettings'),
  async (req: Request, res: Response) => {
    try {
      const settings = await prisma.system_settings.findMany({
        orderBy: {
          key: 'asc'
        }
      });

      res.json({
        success: true,
        data: settings
      });
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch system settings'
      });
    }
  }
);

// @route   GET /api/system-settings/:key
// @desc    Get system setting by key
// @access  Private (Admin)
router.get(
  '/:key',
  authenticate,
  requirePermission('viewSettings'),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      const setting = await prisma.system_settings.findUnique({
        where: { key }
      });

      if (!setting) {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      res.json({
        success: true,
        data: setting
      });
    } catch (error: any) {
      console.error('Error fetching system setting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch system setting'
      });
    }
  }
);

// @route   POST /api/system-settings
// @desc    Create new system setting
// @access  Private (Admin)
router.post(
  '/',
  authenticate,
  requirePermission('editSettings'),
  [
    body('key').notEmpty().withMessage('Key is required'),
    body('value').notEmpty().withMessage('Value is required'),
    body('description').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { key, value, description } = req.body;

      // Check if key already exists
      const existingSetting = await prisma.system_settings.findUnique({
        where: { key }
      });

      if (existingSetting) {
        return res.status(400).json({
          success: false,
          error: 'Setting with this key already exists'
        });
      }

      const setting = await prisma.system_settings.create({
        data: {
          id: randomUUID(),
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          description,
          updatedAt: new Date()
        }
      });

      res.status(201).json({
        success: true,
        data: setting,
        message: 'System setting created successfully'
      });
    } catch (error: any) {
      console.error('Error creating system setting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create system setting'
      });
    }
  }
);

// @route   PUT /api/system-settings/:key
// @desc    Update system setting
// @access  Private (Admin)
router.put(
  '/:key',
  authenticate,
  requirePermission('editSettings'),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      const setting = await prisma.system_settings.update({
        where: { key },
        data: {
          ...(value !== undefined && { value: typeof value === 'string' ? value : JSON.stringify(value) }),
          ...(description !== undefined && { description }),
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: setting,
        message: 'System setting updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating system setting:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update system setting'
      });
    }
  }
);

// @route   DELETE /api/system-settings/:key
// @desc    Delete system setting
// @access  Private (Admin)
router.delete(
  '/:key',
  authenticate,
  requirePermission('editSettings'),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      await prisma.system_settings.delete({
        where: { key }
      });

      res.json({
        success: true,
        message: 'System setting deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting system setting:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete system setting'
      });
    }
  }
);

// @route   POST /api/system-settings/bulk-update
// @desc    Update multiple system settings at once
// @access  Private (Admin)
router.post(
  '/bulk-update',
  authenticate,
  requirePermission('editSettings'),
  async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'Settings must be an array'
        });
      }

      const updatePromises = settings.map((setting: any) =>
        prisma.system_settings.upsert({
          where: { key: setting.key },
          update: {
            value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
            description: setting.description,
            updatedAt: new Date()
          },
          create: {
            id: randomUUID(),
            key: setting.key,
            value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
            description: setting.description,
            updatedAt: new Date()
          }
        })
      );

      const updatedSettings = await Promise.all(updatePromises);

      res.json({
        success: true,
        data: updatedSettings,
        message: `${updatedSettings.length} settings updated successfully`
      });
    } catch (error: any) {
      console.error('Error bulk updating system settings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk update system settings'
      });
    }
  }
);

export default router;
