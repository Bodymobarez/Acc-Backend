import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { bookingService } from '../services/bookingService';
import { cancellationService } from '../services/cancellationService';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

// Validation schemas
const createBookingSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  supplierId: z.string().optional(),
  serviceType: z.enum(['FLIGHT', 'HOTEL', 'TRANSFER', 'RENTAL_CAR', 'RENT_CAR', 'VISA', 'TRAIN', 'CRUISE', 'ACTIVITY']),
  costAmount: z.number().nonnegative('Cost amount must be a positive number'),
  costCurrency: z.string().min(1, 'Cost currency is required'),
  saleAmount: z.number().nonnegative('Sale amount must be a positive number'),
  saleCurrency: z.string().min(1, 'Sale currency is required'),
  isUAEBooking: z.boolean(),
  serviceDetails: z.object({}).passthrough(),
});

const updateCommissionsSchema = z.object({
  agentCommissionRate: z.number().min(0).max(100).optional(),
  csCommissionRate: z.number().min(0).max(100).optional(),
});

const addSupplierSchema = z.object({
  supplierId: z.string().min(1),
  serviceType: z.enum(['FLIGHT', 'HOTEL', 'TRANSFER', 'RENT_CAR', 'VISA', 'TRAIN', 'CRUISE']),
  costAmount: z.number().nonnegative(),
  costCurrency: z.string().min(1),
});

// ==================== RBAC Middleware ====================

/**
 * Get all customer IDs assigned to a user
 */
async function getUserAssignedCustomerIds(userId: string): Promise<string[]> {
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
    
    return assignments.map(a => a.customerId);
  } catch (error) {
    console.error('Error fetching user customer assignments:', error);
    return [];
  }
}

/**
 * Apply booking filter based on user role and assignments
 */
export const applyBookingFilter = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins and managers can see everything
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER') {
    c.set('bookingFilter', null); // null means no filter (full access)
    await next();
    return;
  }
  
  // Accountants can see approved bookings only
  if (user.role === 'ACCOUNTANT') {
    c.set('bookingFilter', {
      status: 'APPROVED'
    });
    await next();
    return;
  }
  
  // For BOOKING_AGENT and CUSTOMER_SERVICE, filter by assigned customers
  const customerIds = await getUserAssignedCustomerIds(user.id);
  
  if (customerIds.length === 0) {
    c.set('bookingFilter', {
      id: 'none' // No access
    });
    await next();
    return;
  }
  
  c.set('bookingFilter', {
    customerId: { in: customerIds }
  });
  
  await next();
};

/**
 * Check if user can access a specific booking
 */
export const canAccessBooking = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  const bookingId = c.req.param('id');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins have full access
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER') {
    await next();
    return;
  }
  
  // Check if booking exists
  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    select: { customerId: true, status: true }
  });
  
  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404);
  }
  
  // Accountants can only access approved bookings
  if (user.role === 'ACCOUNTANT') {
    if (booking.status !== 'APPROVED') {
      return c.json({ error: 'Access denied' }, 403);
    }
    await next();
    return;
  }
  
  // For agents and CS, check customer assignment
  const customerIds = await getUserAssignedCustomerIds(user.id);
  
  if (!customerIds.includes(booking.customerId)) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  await next();
};

// Initialize router
const bookings = new Hono();

// All routes require authentication
bookings.use('*', authenticate);

/**
 * POST / - Create booking
 */
bookings.post(
  '/',
  requirePermission('createBooking'),
  zValidator('json', createBookingSchema),
  async (c: Context) => {
    try {
      const user = c.get('user') as AuthenticatedUser;
      const data = c.req.valid('json');
      
      console.log('📦 Creating booking with data:', {
        serviceType: data.serviceType,
        customerId: data.customerId,
        supplierId: data.supplierId,
        userId: user.id
      });
      
      const booking = await bookingService.createBooking({
        ...data,
        createdById: user.id
      });
      
      console.log('✅ Booking created successfully:', booking.id);
      
      return c.json({
        success: true,
        data: booking
      }, 201);
    } catch (error: any) {
      console.error('❌ Booking creation failed:', {
        message: error.message,
        stack: error.stack
      });
      
      return c.json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 400);
    }
  }
);

/**
 * GET / - Get all bookings (with RBAC filtering)
 */
bookings.get(
  '/',
  requirePermission('viewBookings'),
  applyBookingFilter,
  async (c: Context) => {
    try {
      const rbacFilter = c.get('bookingFilter');
      
      const filters = {
        status: c.req.query('status'),
        serviceType: c.req.query('serviceType'),
        customerId: c.req.query('customerId'),
        supplierId: c.req.query('supplierId'),
        startDate: c.req.query('startDate') ? new Date(c.req.query('startDate')!) : undefined,
        endDate: c.req.query('endDate') ? new Date(c.req.query('endDate')!) : undefined
      };
      
      const bookings = await bookingService.getBookings(filters, rbacFilter);
      
      return c.json({
        success: true,
        data: bookings
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * GET /:id - Get booking by ID (with access check)
 */
bookings.get(
  '/:id',
  requirePermission('viewBookings'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const booking = await bookingService.getBookingById(id);
      
      if (!booking) {
        return c.json({
          success: false,
          error: 'Booking not found'
        }, 404);
      }
      
      return c.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id - Update booking (with access check)
 */
bookings.put(
  '/:id',
  requirePermission('editBooking'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const data = await c.req.json();
      
      const booking = await bookingService.updateBooking(id, data);
      
      return c.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id/commissions - Update commissions (with access check)
 */
bookings.put(
  '/:id/commissions',
  requirePermission('reviewBooking'),
  canAccessBooking,
  zValidator('json', updateCommissionsSchema),
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const { agentCommissionRate, csCommissionRate } = c.req.valid('json');
      
      const booking = await bookingService.updateCommissions(id, {
        agentCommissionRate,
        csCommissionRate
      });
      
      return c.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * POST /:id/approve - Approve booking (with access check)
 */
bookings.post(
  '/:id/approve',
  requirePermission('reviewBooking'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const booking = await bookingService.approveBooking(id);
      
      return c.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * DELETE /:id - Delete booking (with access check)
 */
bookings.delete(
  '/:id',
  requirePermission('deleteBooking'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      await bookingService.deleteBooking(id);
      
      return c.json({
        success: true,
        message: 'Booking deleted successfully'
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * POST /:id/cancel - Cancel booking with refund
 */
bookings.post(
  '/:id/cancel',
  requirePermission('editBooking'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const user = c.get('user') as AuthenticatedUser;
      const id = c.req.param('id');
      const data = await c.req.json();
      
      const result = await cancellationService.cancelBookingWithRefund({
        bookingId: id,
        refundAmount: data.refundAmount,
        refundCurrency: data.refundCurrency,
        refundReason: data.refundReason,
        cancelledById: user.id
      });
      
      return c.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

// ==================== Multi-Supplier Routes ====================

/**
 * POST /:id/suppliers - Add supplier to booking
 */
bookings.post(
  '/:id/suppliers',
  requirePermission('editBooking'),
  canAccessBooking,
  zValidator('json', addSupplierSchema),
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      
      const result = await bookingService.addSupplier(id, data);
      
      return c.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * GET /:id/suppliers - Get booking suppliers
 */
bookings.get(
  '/:id/suppliers',
  requirePermission('viewBookings'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const suppliers = await bookingService.getSuppliers(id);
      
      return c.json({
        success: true,
        data: suppliers
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * DELETE /:id/suppliers/:supplierId - Remove supplier from booking
 */
bookings.delete(
  '/:id/suppliers/:supplierId',
  requirePermission('editBooking'),
  canAccessBooking,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const supplierId = c.req.param('supplierId');
      
      await bookingService.removeSupplier(id, supplierId);
      
      return c.json({
        success: true,
        message: 'Supplier removed successfully'
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

export default bookings;
