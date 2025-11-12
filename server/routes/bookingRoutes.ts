import { Router } from 'express';
import { body } from 'express-validator';
import { bookingController } from '../controllers/bookingController';
import { authenticate, requirePermission } from '../middleware/auth';
import { applyBookingFilter, canAccessBooking } from '../middleware/rbac';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create booking
router.post(
  '/',
  requirePermission('createBooking'),
  validate([
    body('customerId').notEmpty().withMessage('Customer is required'),
    body('supplierId').optional().isString(),
    body('serviceType').isIn(['FLIGHT', 'HOTEL', 'TRANSFER', 'RENTAL_CAR', 'RENT_CAR', 'VISA', 'TRAIN', 'CRUISE', 'ACTIVITY']).withMessage('Invalid service type'),
    body('costAmount').isFloat({ min: 0 }).withMessage('Cost amount must be a positive number'),
    body('costCurrency').notEmpty().withMessage('Cost currency is required'),
    body('saleAmount').isFloat({ min: 0 }).withMessage('Sale amount must be a positive number'),
    body('saleCurrency').notEmpty().withMessage('Sale currency is required'),
    body('isUAEBooking').isBoolean().withMessage('UAE booking flag must be boolean'),
    body('serviceDetails').isObject().withMessage('Service details must be an object')
  ]),
  bookingController.create.bind(bookingController)
);

// Get all bookings (with RBAC filtering)
router.get(
  '/',
  requirePermission('viewBookings'),
  applyBookingFilter,
  bookingController.getAll.bind(bookingController)
);

// Get booking by ID (with access check)
router.get(
  '/:id',
  requirePermission('viewBookings'),
  canAccessBooking,
  bookingController.getById.bind(bookingController)
);

// Update booking (with access check)
router.put(
  '/:id',
  requirePermission('editBooking'),
  canAccessBooking,
  bookingController.update.bind(bookingController)
);

// Update commissions (for accountants, with access check)
router.put(
  '/:id/commissions',
  requirePermission('reviewBooking'),
  canAccessBooking,
  validate([
    body('agentCommissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('csCommissionRate').optional().isFloat({ min: 0, max: 100 })
  ]),
  bookingController.updateCommissions.bind(bookingController)
);

// Approve booking (with access check)
router.post(
  '/:id/approve',
  requirePermission('reviewBooking'),
  canAccessBooking,
  bookingController.approve.bind(bookingController)
);

// Delete booking (with access check)
router.delete(
  '/:id',
  requirePermission('deleteBooking'),
  canAccessBooking,
  bookingController.delete.bind(bookingController)
);

// Cancel booking with refund (creates refund booking and credit note)
router.post(
  '/:id/cancel',
  requirePermission('editBooking'),
  canAccessBooking,
  bookingController.cancelWithRefund.bind(bookingController)
);

// Multi-Supplier Routes

// Add supplier to booking
router.post(
  '/:id/suppliers',
  requirePermission('editBooking'),
  canAccessBooking,
  validate([
    body('supplierId').notEmpty(),
    body('serviceType').isIn(['FLIGHT', 'HOTEL', 'TRANSFER', 'RENT_CAR', 'VISA', 'TRAIN', 'CRUISE']),
    body('costAmount').isFloat({ min: 0 }),
    body('costCurrency').notEmpty()
  ]),
  bookingController.addSupplier.bind(bookingController)
);

// Get booking suppliers
router.get(
  '/:id/suppliers',
  requirePermission('viewBookings'),
  canAccessBooking,
  bookingController.getSuppliers.bind(bookingController)
);

// Remove supplier from booking
router.delete(
  '/:id/suppliers/:supplierId',
  requirePermission('editBooking'),
  canAccessBooking,
  bookingController.removeSupplier.bind(bookingController)
);

export default router;

