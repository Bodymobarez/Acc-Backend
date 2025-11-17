import { Router } from 'express';
import { body } from 'express-validator';
import { invoiceController } from '../controllers/invoiceController';
import { authenticate, requirePermission } from '../middleware/auth';
import { applyInvoiceFilter, canAccessInvoice } from '../middleware/rbac';
import { validate } from '../middleware/validation';
const router = Router();
// All routes require authentication
router.use(authenticate);
// Create invoice
router.post('/', requirePermission('createInvoice'), validate([
    body('bookingId').notEmpty()
]), invoiceController.create.bind(invoiceController));
// Get all invoices (with RBAC filtering)
router.get('/', requirePermission('viewInvoices'), applyInvoiceFilter, invoiceController.getAll.bind(invoiceController));
// Get invoice by ID (with access check)
router.get('/:id', requirePermission('viewInvoices'), canAccessInvoice, invoiceController.getById.bind(invoiceController));
// Update invoice (generic - with access check)
router.put('/:id', requirePermission('editInvoice'), canAccessInvoice, invoiceController.update.bind(invoiceController));
// Update invoice status (with access check)
router.put('/:id/status', requirePermission('editInvoice'), canAccessInvoice, validate([
    body('status').isIn(['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
]), invoiceController.updateStatus.bind(invoiceController));
// Generate PDF (with access check)
router.post('/:id/generate-pdf', requirePermission('generateInvoice'), canAccessInvoice, invoiceController.generatePDF.bind(invoiceController));
// Download PDF (with access check)
router.get('/:id/download', requirePermission('viewInvoices'), canAccessInvoice, invoiceController.downloadPDF.bind(invoiceController));
// Delete invoice (with access check)
router.delete('/:id', requirePermission('deleteInvoice'), canAccessInvoice, invoiceController.delete.bind(invoiceController));
export default router;
