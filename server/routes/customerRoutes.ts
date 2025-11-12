import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types';
import { authenticate, requirePermission } from '../middleware/auth';
import { applyCustomerFilter, canAccessCustomer } from '../middleware/rbac';
import { randomUUID } from 'crypto';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/customers - Get all customers (with RBAC filtering)
router.get(
  '/',
  requirePermission('viewCustomers'),
  applyCustomerFilter,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get RBAC filter from middleware
      const rbacFilter = (req as any).customerFilter;
      
      // Build where clause
      const where: any = {};
      
      // Apply RBAC filter if not admin (null means admin with full access)
      if (rbacFilter !== null) {
        Object.assign(where, rbacFilter);
      }
      
      const customers = await prisma.customers.findMany({
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

      // Return array directly
      res.json(customers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customers'
      });
    }
  }
);

// GET /api/customers/:id - Get customer by ID (with access check)
router.get(
  '/:id',
  requirePermission('viewCustomers'),
  canAccessCustomer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const customer = await prisma.customers.findUnique({
        where: { id }
      });

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer'
      });
    }
  }
);

// POST /api/customers - Create new customer
router.post(
  '/',
  requirePermission('createCustomer'),
  async (req: AuthRequest, res: Response) => {
    try {
      const requestData = req.body;
      
      console.log(`${new Date().toISOString()} - POST /api/customers`);
      console.log('Body:', JSON.stringify(requestData));

      const customerData: any = {
        id: randomUUID(),
        customerCode: requestData.customerCode,
        type: requestData.customerType || 'INDIVIDUAL',
        companyName: requestData.companyName || null,
        firstName: requestData.firstName,
        lastName: requestData.lastName,
        email: requestData.email,
        phone: requestData.primaryPhone || '',
        alternatePhone: requestData.secondaryPhone || null,
        addressLine1: requestData.addressLine1 || '',
        addressLine2: requestData.addressLine2 || null,
        city: requestData.city || '',
        state: requestData.state || null,
        country: requestData.country || '',
        postalCode: requestData.postalCode || null,
        taxNumber: requestData.emiratesId || null,
        taxRegistered: requestData.taxRegistered || false,
        notes: requestData.notes || null,
        isActive: true,
        updatedAt: new Date()
      };

      if (!customerData.customerCode) {
        const lastCustomer = await prisma.customers.findFirst({
          orderBy: { createdAt: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastCustomer && lastCustomer.customerCode) {
          const match = lastCustomer.customerCode.match(/CUST-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        customerData.customerCode = `CUST-${String(nextNumber).padStart(5, '0')}`;
      }

      const customer = await prisma.customers.create({
        data: customerData
      });

      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create customer'
      });
    }
  }
);

// PUT /api/customers/:id - Update customer (with access check)
router.put(
  '/:id',
  requirePermission('editCustomer'),
  canAccessCustomer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const customerData = req.body;

      const customer = await prisma.customers.update({
        where: { id },
        data: {
          ...customerData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update customer'
      });
    }
  }
);

// DELETE /api/customers/:id - Delete customer (with access check)
router.delete(
  '/:id',
  requirePermission('deleteCustomer'),
  canAccessCustomer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const bookingsCount = await prisma.bookings.count({
        where: { customerId: id }
      });

      if (bookingsCount > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete customer. Found ${bookingsCount} booking(s) linked to this customer.`
        });
        return;
      }

      const invoicesCount = await prisma.invoices.count({
        where: { customerId: id }
      });

      if (invoicesCount > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete customer. Found ${invoicesCount} invoice(s) linked to this customer.`
        });
        return;
      }

      await prisma.customers.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete customer'
      });
    }
  }
);

// GET /api/customers/:id/stats - Get customer statistics (with access check)
router.get(
  '/:id/stats',
  requirePermission('viewCustomers'),
  canAccessCustomer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const [customer, bookingsCount, totalSpent] = await Promise.all([
        prisma.customers.findUnique({ where: { id } }),
        prisma.bookings.count({ where: { customerId: id } }),
        prisma.bookings.aggregate({
          where: { customerId: id },
          _sum: { saleInAED: true }
        })
      ]);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          customer,
          stats: {
            totalBookings: bookingsCount,
            totalSpent: totalSpent._sum.saleInAED || 0
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching customer stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer statistics'
      });
    }
  }
);

export default router;
