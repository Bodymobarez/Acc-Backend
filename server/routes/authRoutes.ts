import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Public routes
router.post(
  '/login',
  validate([
    body('username').notEmpty().trim(),
    body('password').notEmpty()
  ]),
  authController.login.bind(authController)
);

router.post(
  '/register',
  validate([
    body('username').notEmpty().trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('role').isIn(['ADMIN', 'ACCOUNTANT', 'BOOKING_AGENT', 'CUSTOMER_SERVICE', 'MANAGER'])
  ]),
  authController.register.bind(authController)
);

// Protected routes
router.get('/profile', authenticate, authController.getProfile.bind(authController));

router.put(
  '/profile',
  authenticate,
  validate([
    body('firstName').optional().notEmpty(),
    body('lastName').optional().notEmpty()
  ]),
  authController.updateProfile.bind(authController)
);

router.post(
  '/change-password',
  authenticate,
  validate([
    body('oldPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ]),
  authController.changePassword.bind(authController)
);

export default router;

