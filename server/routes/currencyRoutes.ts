import express from 'express';
import { currencyController } from '../controllers/currencyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All currency routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/currencies
 * @desc    Get all currencies
 * @access  Private
 */
router.get('/', currencyController.getAll);

/**
 * @route   GET /api/currencies/active
 * @desc    Get active currencies only
 * @access  Private
 */
router.get('/active', currencyController.getActive);

/**
 * @route   GET /api/currencies/:code
 * @desc    Get currency by code
 * @access  Private
 */
router.get('/:code', currencyController.getByCode);

/**
 * @route   POST /api/currencies/update-rates
 * @desc    Update all currency rates from API
 * @access  Private (Admin only - checked in controller)
 */
router.post('/update-rates', currencyController.updateRates);

/**
 * @route   PUT /api/currencies/:code/rate
 * @desc    Update specific currency rate manually
 * @access  Private (Admin only - checked in controller)
 */
router.put('/:code/rate', currencyController.updateManualRate);

/**
 * @route   POST /api/currencies/convert
 * @desc    Convert amount between currencies
 * @access  Private
 */
router.post('/convert', currencyController.convert);

/**
 * @route   PUT /api/currencies/:code/toggle
 * @desc    Toggle currency active status
 * @access  Private (Admin only - checked in controller)
 */
router.put('/:code/toggle', currencyController.toggleStatus);

/**
 * @route   POST /api/currencies/initialize
 * @desc    Initialize default currencies
 * @access  Private (Admin only - checked in controller)
 */
router.post('/initialize', currencyController.initializeDefaults);

export default router;
