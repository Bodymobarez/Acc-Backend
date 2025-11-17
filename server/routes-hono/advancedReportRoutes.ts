import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const advancedReports = new Hono();
advancedReports.use('*', authenticate);

// Advanced reports with complex queries
advancedReports.get('/profit-loss', async (c) => {
  try {
    const { startDate, endDate } = c.req.query();
    
    // Revenue from invoices
    const invoices = await prisma.invoices.findMany({
      where: {
        date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
        status: 'paid'
      }
    });
    
    const revenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    
    // Costs from bookings
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined }
      }
    });
    
    const costs = bookings.reduce((sum, b) => sum + Number(b.supplierCost || 0), 0);
    
    return c.json({ success: true, data: { revenue, costs, profit: revenue - costs } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

advancedReports.get('/customer-analysis', async (c) => {
  try {
    const customers = await prisma.customers.findMany({
      include: {
        bookings: true,
        invoices: true
      }
    });
    
    const analysis = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      bookingsCount: customer.bookings.length,
      totalRevenue: customer.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    }));
    
    return c.json({ success: true, data: analysis });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

advancedReports.get('/supplier-analysis', async (c) => {
  try {
    const suppliers = await prisma.suppliers.findMany({
      include: {
        bookings: true
      }
    });
    
    const analysis = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      bookingsCount: supplier.bookings.length,
      totalCost: supplier.bookings.reduce((sum, b) => sum + Number(b.supplierCost || 0), 0)
    }));
    
    return c.json({ success: true, data: analysis });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default advancedReports;
