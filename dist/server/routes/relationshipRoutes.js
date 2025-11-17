import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { relationshipService } from '../services/relationshipService';
const router = Router();
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};
// @route   GET /api/relationships/verify/booking/:bookingId
// @desc    Verify booking to invoice relationship
// @access  Private
router.get('/verify/booking/:bookingId', authenticate, requirePermission('viewBookings'), [param('bookingId').notEmpty().withMessage('Booking ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const result = await relationshipService.verifyBookingToInvoiceRelationship(bookingId);
        res.json({
            success: result.valid,
            data: result
        });
    }
    catch (error) {
        console.error('Error verifying booking relationship:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify booking relationship'
        });
    }
});
// @route   GET /api/relationships/verify/invoice/:invoiceId
// @desc    Verify invoice to receipt relationship
// @access  Private
router.get('/verify/invoice/:invoiceId', authenticate, requirePermission('viewInvoices'), [param('invoiceId').notEmpty().withMessage('Invoice ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const result = await relationshipService.verifyInvoiceToReceiptRelationship(invoiceId);
        res.json({
            success: result.valid,
            data: result
        });
    }
    catch (error) {
        console.error('Error verifying invoice relationship:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify invoice relationship'
        });
    }
});
// @route   GET /api/relationships/verify/receipt/:receiptId
// @desc    Verify receipt matching
// @access  Private
router.get('/verify/receipt/:receiptId', authenticate, requirePermission('viewInvoices'), [param('receiptId').notEmpty().withMessage('Receipt ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { receiptId } = req.params;
        const result = await relationshipService.verifyReceiptMatching(receiptId);
        res.json({
            success: result.valid,
            data: result
        });
    }
    catch (error) {
        console.error('Error verifying receipt matching:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify receipt matching'
        });
    }
});
// @route   GET /api/relationships/flow/booking/:bookingId
// @desc    Get complete transaction flow for booking
// @access  Private
router.get('/flow/booking/:bookingId', authenticate, requirePermission('viewBookings'), [param('bookingId').notEmpty().withMessage('Booking ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const result = await relationshipService.getCompleteTransactionFlow(bookingId);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting transaction flow:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get transaction flow'
        });
    }
});
// @route   POST /api/relationships/sync/invoice/:invoiceId
// @desc    Synchronize invoice status with receipts
// @access  Private (Accountant/Admin)
router.post('/sync/invoice/:invoiceId', authenticate, requirePermission('editInvoice'), [param('invoiceId').notEmpty().withMessage('Invoice ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const result = await relationshipService.synchronizeInvoiceStatus(invoiceId);
        res.json({
            success: true,
            data: result,
            message: result.updated
                ? `Invoice status synchronized: ${result.oldStatus} → ${result.newStatus}`
                : 'Invoice status is already correct'
        });
    }
    catch (error) {
        console.error('Error synchronizing invoice status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to synchronize invoice status'
        });
    }
});
export default router;
