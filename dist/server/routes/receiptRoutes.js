import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { receiptService } from '../services/receiptService';
import { authenticate } from '../middleware/auth';
const router = Router();
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};
// @route   POST /api/receipts
// @desc    Create new receipt
// @access  Private
router.post('/', authenticate, [
    body('receiptNumber').notEmpty().withMessage('Receipt number is required'),
    body('customerId').notEmpty().withMessage('Customer is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').isIn(['CASH', 'BANK', 'CREDIT_CARD', 'CHECK']).withMessage('Invalid payment method'),
], handleValidationErrors, async (req, res) => {
    try {
        const receipt = await receiptService.createReceipt({
            ...req.body,
            createdById: req.user?.id,
        });
        res.json({
            success: true,
            data: receipt,
            message: 'Receipt created successfully',
        });
    }
    catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create receipt',
        });
    }
});
// @route   GET /api/receipts
// @desc    Get all receipts with optional filters
// @access  Private
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            customerId: req.query.customerId,
            status: req.query.status,
            paymentMethod: req.query.paymentMethod,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        };
        const receipts = await receiptService.getAllReceipts(filters);
        res.json({
            success: true,
            data: receipts,
        });
    }
    catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch receipts',
        });
    }
});
// @route   GET /api/receipts/generate-number
// @desc    Generate new receipt number
// @access  Private
router.get('/generate-number', authenticate, async (req, res) => {
    try {
        const receiptNumber = await receiptService.generateReceiptNumber();
        res.json({
            success: true,
            data: { receiptNumber },
        });
    }
    catch (error) {
        console.error('Error generating receipt number:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate receipt number',
        });
    }
});
// @route   GET /api/receipts/:id
// @desc    Get receipt by ID
// @access  Private
router.get('/:id', authenticate, [param('id').notEmpty().withMessage('Receipt ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const receipt = await receiptService.getReceiptById(req.params.id);
        res.json({
            success: true,
            data: receipt,
        });
    }
    catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(404).json({
            success: false,
            error: error.message || 'Receipt not found',
        });
    }
});
// @route   PUT /api/receipts/:id
// @desc    Update receipt
// @access  Private
router.put('/:id', authenticate, [param('id').notEmpty().withMessage('Receipt ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const receipt = await receiptService.updateReceipt(req.params.id, req.body);
        res.json({
            success: true,
            data: receipt,
            message: 'Receipt updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update receipt',
        });
    }
});
// @route   DELETE /api/receipts/:id
// @desc    Delete receipt
// @access  Private
router.delete('/:id', authenticate, [param('id').notEmpty().withMessage('Receipt ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const result = await receiptService.deleteReceipt(req.params.id);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete receipt',
        });
    }
});
// @route   GET /api/receipts/customer/:customerId
// @desc    Get receipts by customer
// @access  Private
router.get('/customer/:customerId', authenticate, [param('customerId').notEmpty().withMessage('Customer ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const receipts = await receiptService.getReceiptsByCustomer(req.params.customerId);
        res.json({
            success: true,
            data: receipts,
        });
    }
    catch (error) {
        console.error('Error fetching customer receipts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch customer receipts',
        });
    }
});
// @route   GET /api/receipts/invoice/:invoiceId
// @desc    Get receipts by invoice
// @access  Private
router.get('/invoice/:invoiceId', authenticate, [param('invoiceId').notEmpty().withMessage('Invoice ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const receipts = await receiptService.getReceiptsByInvoice(req.params.invoiceId);
        res.json({
            success: true,
            data: receipts,
        });
    }
    catch (error) {
        console.error('Error fetching invoice receipts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch invoice receipts',
        });
    }
});
export default router;
