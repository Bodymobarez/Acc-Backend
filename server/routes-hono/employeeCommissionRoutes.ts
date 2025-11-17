import { Hono } from 'hono';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const employeeCommission = new Hono();
employeeCommission.use('*', authenticate, requirePermission('viewFinancialReports'));

employeeCommission.get('/', async (c) => {
  try {
    const { employeeId, startDate, endDate } = c.req.query();
    
    const commissions = await prisma.employee_commissions.findMany({
      where: {
        employeeId: employeeId || undefined,
        createdAt: { 
          gte: startDate ? new Date(startDate) : undefined, 
          lte: endDate ? new Date(endDate) : undefined 
        }
      },
      include: {
        employees: { include: { users: true } },
        bookings: { include: { customers: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const paid = commissions.filter(c => c.isPaid).reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    
    return c.json({ 
      success: true, 
      data: commissions,
      stats: { 
        total, 
        paid, 
        pending: total - paid,
        count: commissions.length 
      } 
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

employeeCommission.get('/summary', async (c) => {
  try {
    const { startDate, endDate } = c.req.query();
    
    const commissions = await prisma.employee_commissions.findMany({
      where: {
        createdAt: { 
          gte: startDate ? new Date(startDate) : undefined, 
          lte: endDate ? new Date(endDate) : undefined 
        }
      },
      include: {
        employees: { include: { users: true } }
      }
    });
    
    // Group by employee
    const summary = commissions.reduce((acc, comm) => {
      const empId = comm.employeeId;
      if (!acc[empId]) {
        acc[empId] = {
          employeeId: empId,
          employeeName: comm.employees?.users?.name || 'Unknown',
          totalCommission: 0,
          paidCommission: 0,
          pendingCommission: 0,
          count: 0
        };
      }
      
      const amount = Number(comm.commissionAmount);
      acc[empId].totalCommission += amount;
      acc[empId].count += 1;
      
      if (comm.isPaid) {
        acc[empId].paidCommission += amount;
      } else {
        acc[empId].pendingCommission += amount;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return c.json({ success: true, data: Object.values(summary) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default employeeCommission;
