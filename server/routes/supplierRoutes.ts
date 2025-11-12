import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/suppliers - Get all suppliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.suppliers.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map database fields to frontend format
    const mappedSuppliers = suppliers.map(supplier => ({
      ...supplier,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.isActive ? 'Active' : 'Inactive'
    }));

    res.json(mappedSuppliers);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch suppliers'
    });
  }
});

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.suppliers.findUnique({
      where: { id }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch supplier'
    });
  }
});

// POST /api/suppliers - Create new supplier
router.post('/', async (req: Request, res: Response) => {
  try {
    const requestData = req.body;
    
    console.log(`${new Date().toISOString()} - POST /api/suppliers`);
    console.log('Body:', JSON.stringify(requestData));

    // Map frontend fields to database schema
    const supplierData: any = {
      id: randomUUID(),
      supplierCode: requestData.supplierCode,
      companyName: requestData.companyName,
      contactPerson: requestData.primaryContactName || '',
      email: requestData.primaryEmail,
      phone: requestData.primaryPhone || '', // Map primaryPhone to phone
      alternatePhone: requestData.secondaryPhone || null,
      addressLine1: requestData.addressLine1 || '',
      addressLine2: requestData.addressLine2 || null,
      city: requestData.city || '',
      state: requestData.state || null,
      country: requestData.country || '',
      postalCode: requestData.postalCode || null,
      taxNumber: requestData.licenseNumber || null,
      taxRegistered: requestData.taxRegistered || false,
      paymentTerms: requestData.paymentTerms || null,
      currency: requestData.preferredCurrency || 'AED',
      serviceTypes: requestData.serviceTypes || '',
      notes: requestData.notes || null,
      isActive: requestData.status !== undefined ? requestData.status : true,
      updatedAt: new Date()
    };

    // Auto-generate supplier code if not provided
    if (!supplierData.supplierCode) {
      // Get last supplier to determine next code
      const lastSupplier = await prisma.suppliers.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      let nextNumber = 1;
      if (lastSupplier && lastSupplier.supplierCode) {
        const match = lastSupplier.supplierCode.match(/SUPP-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      supplierData.supplierCode = `SUPP-${String(nextNumber).padStart(5, '0')}`;
    }

    const supplier = await prisma.suppliers.create({
      data: supplierData
    });

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create supplier'
    });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestData = req.body;
    
    console.log(`${new Date().toISOString()} - PUT /api/suppliers/${id}`);
    console.log('Body:', JSON.stringify(requestData));

    // Map frontend fields to database schema
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only include fields that are provided
    if (requestData.companyName !== undefined) updateData.companyName = requestData.companyName;
    if (requestData.primaryContactName !== undefined) updateData.contactPerson = requestData.primaryContactName;
    if (requestData.primaryEmail !== undefined) updateData.email = requestData.primaryEmail;
    if (requestData.primaryPhone !== undefined) updateData.phone = requestData.primaryPhone;
    if (requestData.secondaryPhone !== undefined) updateData.alternatePhone = requestData.secondaryPhone;
    // website field doesn't exist in database schema - skip it
    // if (requestData.website !== undefined) updateData.website = requestData.website;
    if (requestData.addressLine1 !== undefined) updateData.addressLine1 = requestData.addressLine1;
    if (requestData.addressLine2 !== undefined) updateData.addressLine2 = requestData.addressLine2;
    if (requestData.city !== undefined) updateData.city = requestData.city;
    if (requestData.state !== undefined) updateData.state = requestData.state;
    if (requestData.country !== undefined) updateData.country = requestData.country;
    if (requestData.postalCode !== undefined) updateData.postalCode = requestData.postalCode;
    if (requestData.taxNumber !== undefined) updateData.taxNumber = requestData.taxNumber;
    if (requestData.serviceTypes !== undefined) updateData.serviceTypes = requestData.serviceTypes;
    if (requestData.paymentTerms !== undefined) updateData.paymentTerms = requestData.paymentTerms;
    if (requestData.preferredCurrency !== undefined) updateData.currency = requestData.preferredCurrency;
    if (requestData.notes !== undefined) updateData.notes = requestData.notes;
    if (requestData.status !== undefined) {
      updateData.isActive = requestData.status === 'active';
    }

    const supplier = await prisma.suppliers.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update supplier'
    });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if supplier has bookings
    const bookingsCount = await prisma.bookings.count({
      where: { supplierId: id }
    });

    if (bookingsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete supplier. Found ${bookingsCount} booking(s) linked to this supplier.`
      });
    }

    await prisma.suppliers.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete supplier'
    });
  }
});

// GET /api/suppliers/:id/stats - Get supplier statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [supplier, bookingsCount, totalRevenue] = await Promise.all([
      prisma.suppliers.findUnique({ where: { id } }),
      prisma.bookings.count({ where: { supplierId: id } }),
      prisma.bookings.aggregate({
        where: { supplierId: id },
        _sum: { costInAED: true }
      })
    ]);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: {
        supplier,
        stats: {
          totalBookings: bookingsCount,
          totalRevenue: totalRevenue._sum.costInAED || 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch supplier statistics'
    });
  }
});

export default router;
