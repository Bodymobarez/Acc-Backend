import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { invoiceController } from '../controllers/invoiceController';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

// Helper
const makeFakeRes = (c: any) => {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
};

// Validation schemas
const createInvoiceSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
});

// ==================== RBAC Middleware ====================

/**
 * Get all booking IDs accessible to a user
 */
async function getUserAccessibleBookingIds(userId: string): Promise<string[]> {
  try {
    const assignments = await prisma.customer_assignments.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        customerId: true
      }
    });
    
    const customerIds = assignments.map(a => a.customerId);
    
    if (customerIds.length === 0) {
      return [];
    }
    
    const bookings = await prisma.bookings.findMany({
      where: {
        customerId: { in: customerIds }
      },
      select: {
        id: true
      }
    });
    
    return bookings.map(b => b.id);
  } catch (error) {
    console.error('Error fetching user accessible bookings:', error);
    return [];
  }
}

/**
 * Apply invoice filter based on user role and assignments
 */
export const applyInvoiceFilter = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins, managers, and accountants can see everything
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER' || user.role === 'ACCOUNTANT') {
    c.set('invoiceFilter', null);
    await next();
    return;
  }
  
  // For agents and CS, filter by assigned customers' bookings
  const bookingIds = await getUserAccessibleBookingIds(user.id);
  
  if (bookingIds.length === 0) {
    c.set('invoiceFilter', {
      id: 'none'
    });
    await next();
    return;
  }
  
  c.set('invoiceFilter', {
    bookingId: { in: bookingIds }
  });
  
  await next();
};

/**
 * Check if user can access a specific invoice
 */
export const canAccessInvoice = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  const invoiceId = c.req.param('id');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins have full access
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER' || user.role === 'ACCOUNTANT') {
    await next();
    return;
  }
  
  // Check if invoice exists
  const invoice = await prisma.invoices.findUnique({
    where: { id: invoiceId },
    select: { bookingId: true }
  });
  
  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
  }
  
  // Check if user has access to the booking
  const bookingIds = await getUserAccessibleBookingIds(user.id);
  
  if (!bookingIds.includes(invoice.bookingId)) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  await next();
};

// Initialize router
const invoices = new Hono();

// All routes require authentication
invoices.use('*', authenticate);

/**
 * POST / - Create invoice
 */
invoices.post(
  '/',
  requirePermission('createInvoice'),
  zValidator('json', createInvoiceSchema),
  async (c: Context) => {
    try {
      const data = c.req.valid('json');
      const result = await invoiceController.create({
        body: data
      } as any, {} as any);
      
      // Controller handles response internally for now
      // TODO: Refactor controller to return data instead
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * GET / - Get all invoices (with RBAC filtering)
 */
invoices.get(
  '/',
  requirePermission('viewInvoices'),
  applyInvoiceFilter,
  async (c: Context) => {
    try {
      const rbacFilter = c.get('invoiceFilter');
      
      // Create fake request object for controller
      const fakeReq: any = {
        query: {
          status: c.req.query('status'),
          customerId: c.req.query('customerId'),
          startDate: c.req.query('startDate'),
          endDate: c.req.query('endDate'),
        },
        invoiceFilter: rbacFilter
      };
      
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.getAll(fakeReq, fakeRes);
      return c.json(result() || { success: true, data: [] }, status());
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * GET /:id - Get invoice by ID (with access check)
 */
invoices.get(
  '/:id',
  requirePermission('viewInvoices'),
  canAccessInvoice,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      const fakeReq: any = { params: { id } };
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.getById(fakeReq, fakeRes);
      return c.json(result() || { success: false }, status());
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id - Update invoice (with access check)
 */
invoices.put(
  '/:id',
  requirePermission('editInvoice'),
  canAccessInvoice,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const data = await c.req.json();
      
      const fakeReq: any = { params: { id }, body: data };
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.update(fakeReq, fakeRes);
      return c.json(result() || { success: true }, status());
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /:id/status - Update invoice status (with access check)
 */
invoices.put(
  '/:id/status',
  requirePermission('editInvoice'),
  canAccessInvoice,
  zValidator('json', updateStatusSchema),
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const { status: invoiceStatus } = c.req.valid('json');
      
      const fakeReq: any = { params: { id }, body: { status: invoiceStatus } };
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.updateStatus(fakeReq, fakeRes);
      return c.json(result() || { success: true }, status());
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /:id/generate-pdf - Generate PDF (with access check)
 */
invoices.post(
  '/:id/generate-pdf',
  requirePermission('generateInvoice'),
  canAccessInvoice,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      const fakeReq: any = { params: { id } };
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.generatePDF(fakeReq, fakeRes);
      return c.json(result() || { success: true }, status());
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * GET /:id/download - Download PDF (with access check)
 */
invoices.get(
  '/:id/download',
  requirePermission('viewInvoices'),
  canAccessInvoice,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      const fakeReq: any = { params: { id } };
      const fakeRes: any = {
        download: (path: string, filename: string) => {
          // TODO: Implement file download for Hono
          return c.json({ success: true, message: 'Download not yet implemented' });
        },
        status: (code: number) => ({
          json: (data: any) => c.json(data, code)
        })
      };
      
      await invoiceController.downloadPDF(fakeReq, fakeRes);
      return c.json(result() || { success: false }, 500, status());
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * DELETE /:id - Delete invoice (with access check)
 */
invoices.delete(
  '/:id',
  requirePermission('deleteInvoice'),
  canAccessInvoice,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      const fakeReq: any = { params: { id } };
      const { fakeRes, result, status } = makeFakeRes(c);
      await invoiceController.delete(fakeReq, fakeRes);
      return c.json(result() || { success: true }, status());
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

export default invoices;
