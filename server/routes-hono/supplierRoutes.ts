import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

// Validation schemas
const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
  isActive: z.boolean().optional().default(true),
});

// Initialize router
const suppliers = new Hono();

// All routes require authentication
suppliers.use('*', authenticate);

/**
 * GET / - Get all suppliers
 */
suppliers.get('/', async (c: Context) => {
  try {
    const supplierList = await prisma.suppliers.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const mapped = supplierList.map(supplier => ({
      ...supplier,
      status: supplier.isActive ? 'Active' : 'Inactive'
    }));
    
    return c.json(mapped);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to fetch suppliers'
    }, 500);
  }
});

/**
 * GET /:id - Get supplier by ID
 */
suppliers.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const supplier = await prisma.suppliers.findUnique({
      where: { id }
    });
    
    if (!supplier) {
      return c.json({
        success: false,
        error: 'Supplier not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to fetch supplier'
    }, 500);
  }
});

/**
 * POST / - Create supplier
 */
suppliers.post(
  '/',
  zValidator('json', createSupplierSchema),
  async (c: Context) => {
    try {
      const data = c.req.valid('json');
      
      const supplier = await prisma.suppliers.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return c.json({
        success: true,
        data: supplier
      }, 201);
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id - Update supplier
 */
suppliers.put('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    
    const supplier = await prisma.suppliers.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    return c.json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * DELETE /:id - Delete supplier
 */
suppliers.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    await prisma.suppliers.delete({
      where: { id }
    });
    
    return c.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

export default suppliers;
