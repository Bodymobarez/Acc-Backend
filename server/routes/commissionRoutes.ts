import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { AuthRequest } from '../types';
import { commissionVerificationService } from '../services/commissionVerificationService';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// @route   GET /api/commissions/verify/booking/:bookingId/relationships
// @desc    Verify booking-user relationships
// @access  Private
router.get(
  '/verify/booking/:bookingId/relationships',
  authenticate,
  requirePermission('viewBookings'),
  [param('bookingId').notEmpty().withMessage('Booking ID is required')],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const result = await commissionVerificationService.verifyBookingUserRelationships(bookingId);

      res.json({
        success: result.valid,
        data: result
      });
    } catch (error: any) {
      console.error('Error verifying booking relationships:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify booking relationships'
      });
    }
  }
);

// @route   GET /api/commissions/verify/booking/:bookingId/calculations
// @desc    Verify commission calculations
// @access  Private
router.get(
  '/verify/booking/:bookingId/calculations',
  authenticate,
  requirePermission('viewBookings'),
  [param('bookingId').notEmpty().withMessage('Booking ID is required')],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const result = await commissionVerificationService.verifyCommissionCalculations(bookingId);

      res.json({
        success: result.valid,
        data: result,
        message: result.valid 
          ? 'All commission calculations are correct' 
          : 'Commission calculation errors detected'
      });
    } catch (error: any) {
      console.error('Error verifying commission calculations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify commission calculations'
      });
    }
  }
);

// @route   GET /api/commissions/verify/booking/:bookingId/rates
// @desc    Verify commission rates match employee defaults
// @access  Private
router.get(
  '/verify/booking/:bookingId/rates',
  authenticate,
  requirePermission('viewBookings'),
  [param('bookingId').notEmpty().withMessage('Booking ID is required')],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const result = await commissionVerificationService.verifyCommissionRates(bookingId);

      res.json({
        success: result.valid,
        data: result,
        message: result.valid 
          ? 'Commission rates match employee defaults' 
          : 'Commission rate mismatches detected'
      });
    } catch (error: any) {
      console.error('Error verifying commission rates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify commission rates'
      });
    }
  }
);

// @route   GET /api/commissions/employee/:employeeId/summary
// @desc    Get employee commission summary
// @access  Private
router.get(
  '/employee/:employeeId/summary',
  authenticate,
  requirePermission('viewBookings'),
  [param('employeeId').notEmpty().withMessage('Employee ID is required')],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const result = await commissionVerificationService.getEmployeeCommissionSummary(employeeId);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error getting employee commission summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get employee commission summary'
      });
    }
  }
);

// @route   GET /api/commissions/audit/all
// @desc    Find all commission calculation issues in system
// @access  Private (Admin/Accountant)
router.get(
  '/audit/all',
  authenticate,
  requirePermission('managePermissions'),
  async (req: Request, res: Response) => {
    try {
      const result = await commissionVerificationService.findAllCommissionIssues();

      res.json({
        success: true,
        data: result,
        message: result.bookingsWithIssues === 0
          ? 'No commission issues found'
          : `Found ${result.bookingsWithIssues} booking(s) with commission issues`
      });
    } catch (error: any) {
      console.error('Error auditing commissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit commissions'
      });
    }
  }
);

export default router;
