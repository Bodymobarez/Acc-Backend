import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
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
 * Apply customer filter based on user role and assignments
 */
export const applyCustomerFilter = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins and managers can see everything
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER' || user.role === 'ACCOUNTANT') {
    c.set('customerFilter', null);
    await next();
    return;
  }
  
  // For agents and CS, filter by assigned customers
  const customerIds = await getUserAssignedCustomerIds(user.id);
  
  if (customerIds.length === 0) {
    c.set('customerFilter', {
      id: 'none'
    });
    await next();
    return;
  }
  
  c.set('customerFilter', {
    id: { in: customerIds }
  });
  
  await next();
};

/**
 * Check if user can access a specific customer
 */
export const canAccessCustomer = async (c: Context, next: () => Promise<void>) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  const customerId = c.req.param('id');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Admins have full access
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCIAL_CONTROLLER' || user.role === 'ACCOUNTANT') {
    await next();
    return;
  }
  
  // Check if customer exists
  const customer = await prisma.customers.findUnique({
    where: { id: customerId }
  });
  
  if (!customer) {
    return c.json({ error: 'Customer not found' }, 404);
  }
  
  // Check if user is assigned to this customer
  const customerIds = await getUserAssignedCustomerIds(user.id);
  
  if (!customerIds.includes(customerId)) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  await next();
};

// Initialize router
const customers = new Hono();

// All routes require authentication
customers.use('*', authenticate);

/**
 * GET / - Get all customers (with RBAC filtering)
 */
customers.get(
  '/',
  requirePermission('viewCustomers'),
  applyCustomerFilter,
  async (c: Context) => {
    try {
      const rbacFilter = c.get('customerFilter');
      
      const where: any = {};
      
      if (rbacFilter !== null) {
        Object.assign(where, rbacFilter);
      }
      
      const customerList = await prisma.customers.findMany({
        where,
        include: {
          customer_assignments: {
            where: { isActive: true },
            include: {
              users: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return c.json({
        success: true,
        data: customerList
      });
    } catch (error: any) {
      console.error('❌ Error fetching customers:', error);
      console.error('Error stack:', error.stack);
      return c.json({
        success: false,
        error: error.message || 'Failed to fetch customers',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 500);
    }
  }
);

/**
 * GET /:id - Get customer by ID (with access check)
 */
customers.get(
  '/:id',
  requirePermission('viewCustomers'),
  canAccessCustomer,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      const customer = await prisma.customers.findUnique({
        where: { id },
        include: {
          customer_assignments: {
            where: { isActive: true },
            include: {
              users: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });
      
      if (!customer) {
        return c.json({
          success: false,
          error: 'Customer not found'
        }, 404);
      }
      
      return c.json(customer);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      return c.json({
        success: false,
        error: error.message
      }, 500);
    }
  }
);

/**
 * POST / - Create customer
 */
customers.post(
  '/',
  requirePermission('createCustomer'),
  zValidator('json', createCustomerSchema),
  async (c: Context) => {
    try {
      const data = c.req.valid('json');
      const user = c.get('user') as AuthenticatedUser;
      
      const customer = await prisma.customers.create({
        data: {
          ...data,
          createdById: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return c.json({
        success: true,
        data: customer
      }, 201);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id - Update customer (with access check)
 */
customers.put(
  '/:id',
  requirePermission('editCustomer'),
  canAccessCustomer,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const data = await c.req.json();
      
      const customer = await prisma.customers.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
      
      return c.json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * DELETE /:id - Delete customer (with access check)
 */
customers.delete(
  '/:id',
  requirePermission('deleteCustomer'),
  canAccessCustomer,
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      
      await prisma.customers.delete({
        where: { id }
      });
      
      return c.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

export default customers;
