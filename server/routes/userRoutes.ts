import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user statistics (MUST be before /:id route)
router.get('/stats', userController.getUserStats);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Create new user
router.post(
  '/',
  validate([
    body('username').notEmpty().trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('role').notEmpty(),
  ]),
  userController.createUser
);

// Update user
router.put(
  '/:id',
  validate([
    body('username').optional().trim().isLength({ min: 3 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('role').optional(),
  ]),
  userController.updateUser
);

// Delete user
router.delete('/:id', userController.deleteUser);

// Toggle user status
router.patch('/:id/toggle-status', userController.toggleUserStatus);

export default router;
