import express from 'express';
import { reportController } from '../controllers/reportController';
import { authenticate, requirePermission } from '../middleware/auth';

const router = express.Router();

// All report routes require authentication and view reports permission
router.use(authenticate);
router.use(requirePermission('viewReports'));

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get comprehensive dashboard data with all key metrics
 * @access  Private (viewReports permission)
 */
router.get('/dashboard', reportController.getDashboardData.bind(reportController));

/**
 * @route   GET /api/reports/financial-summary
 * @desc    Get financial summary with key metrics (NEW - with refunds)
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial-summary',
  requirePermission('viewFinancialReports'),
  reportController.getFinancialSummary.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/summary
 * @desc    Get financial summary with key metrics
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial/summary',
  requirePermission('viewFinancialReports'),
  reportController.getFinancialSummary.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/revenue
 * @desc    Get revenue time series data
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial/revenue',
  requirePermission('viewFinancialReports'),
  reportController.getRevenueTimeSeries.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/profit-loss
 * @desc    Get profit & loss statement
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial/profit-loss',
  requirePermission('viewFinancialReports'),
  reportController.getProfitLoss.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/cash-flow
 * @desc    Get cash flow statement
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial/cash-flow',
  requirePermission('viewFinancialReports'),
  reportController.getCashFlow.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/aging
 * @desc    Get aging report for receivables
 * @access  Private (viewFinancialReports permission)
 */
router.get(
  '/financial/aging',
  requirePermission('viewFinancialReports'),
  reportController.getAgingReport.bind(reportController)
);

/**
 * @route   GET /api/reports/financial/vat
 * @desc    Get VAT report
 * @access  Private (viewVATReports permission)
 */
router.get(
  '/financial/vat',
  requirePermission('viewVATReports'),
  reportController.getVATReport.bind(reportController)
);

/**
 * @route   GET /api/reports/customers/analysis
 * @desc    Get customer analysis with top customers and metrics
 * @access  Private (viewReports permission)
 */
router.get('/customers/analysis', reportController.getCustomerAnalysis.bind(reportController));

/**
 * @route   GET /api/reports/suppliers/performance
 * @desc    Get supplier performance report
 * @access  Private (viewReports permission)
 */
router.get('/suppliers/performance', reportController.getSupplierPerformance.bind(reportController));

/**
 * @route   GET /api/reports/commissions
 * @desc    Get commissions breakdown by employee
 * @access  Private (viewCommissionReports permission)
 */
router.get(
  '/commissions',
  requirePermission('viewCommissionReports'),
  reportController.getCommissions.bind(reportController)
);

/**
 * @route   GET /api/reports/kpis
 * @desc    Get KPIs with trends and comparisons
 * @access  Private (viewReports permission)
 */
router.get('/kpis', reportController.getKPIs.bind(reportController));

/**
 * @route   GET /api/reports/bookings/performance
 * @desc    Get booking performance metrics
 * @access  Private (viewReports permission)
 */
router.get('/bookings/performance', reportController.getBookingPerformance.bind(reportController));

/**
 * @route   GET /api/reports/preset/:preset/:reportType
 * @desc    Get report by preset (today, thisWeek, thisMonth, etc.)
 * @access  Private (viewReports permission)
 * @params  preset: today | yesterday | last7days | last30days | thisWeek | lastWeek | thisMonth | lastMonth | thisQuarter | thisYear | lastYear
 *          reportType: financial | profit-loss | cash-flow | customer | supplier | vat | booking
 */
router.get('/preset/:preset/:reportType', reportController.getReportByPreset.bind(reportController));

/**
 * @route   GET /api/reports/compare/:reportType
 * @desc    Compare current period with previous period
 * @access  Private (viewReports permission)
 * @params  reportType: financial | booking
 */
router.get('/compare/:reportType', reportController.comparePeriods.bind(reportController));

export default router;
