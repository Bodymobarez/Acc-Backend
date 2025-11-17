import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get monthly employee commission report (all employees aggregated)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    // Get all bookings for the period with employee data
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'REFUNDED']
        }
      },
      select: {
        id: true,
        bookingNumber: true,
        bookingDate: true,
        agentCommissionAmount: true,
        csCommissionAmount: true,
        employees_bookings_bookingAgentIdToemployees: {
          select: {
            id: true,
            users: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            department: true
          }
        },
        employees_bookings_customerServiceIdToemployees: {
          select: {
            id: true,
            users: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            department: true
          }
        }
      }
    });

    // Aggregate commissions by employee
    const employeeMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      department: string;
      totalBookings: number;
      agentCommission: number;
      csCommission: number;
      totalCommission: number;
    }>();

    for (const booking of bookings) {
      // Process booking agent commission
      if (booking.employees_bookings_bookingAgentIdToemployees && booking.agentCommissionAmount) {
        const agent = booking.employees_bookings_bookingAgentIdToemployees;
        const agentId = agent.id;
        const agentName = `${agent.users.firstName} ${agent.users.lastName}`;
        const commission = Number(booking.agentCommissionAmount);

        if (!employeeMap.has(agentId)) {
          employeeMap.set(agentId, {
            employeeId: agentId,
            employeeName: agentName,
            department: agent.department || 'N/A',
            totalBookings: 0,
            agentCommission: 0,
            csCommission: 0,
            totalCommission: 0
          });
        }

        const emp = employeeMap.get(agentId)!;
        emp.totalBookings++;
        emp.agentCommission += commission;
        emp.totalCommission += commission;
      }

      // Process customer service commission
      if (booking.employees_bookings_customerServiceIdToemployees && booking.csCommissionAmount) {
        const cs = booking.employees_bookings_customerServiceIdToemployees;
        const csId = cs.id;
        const csName = `${cs.users.firstName} ${cs.users.lastName}`;
        const commission = Number(booking.csCommissionAmount);

        if (!employeeMap.has(csId)) {
          employeeMap.set(csId, {
            employeeId: csId,
            employeeName: csName,
            department: cs.department || 'N/A',
            totalBookings: 0,
            agentCommission: 0,
            csCommission: 0,
            totalCommission: 0
          });
        }

        const emp = employeeMap.get(csId)!;
        emp.totalBookings++;
        emp.csCommission += commission;
        emp.totalCommission += commission;
      }
    }

    // Convert to array and sort by total commission
    const employees = Array.from(employeeMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);

    // Calculate summary
    const totalEmployees = employees.length;
    const totalBookings = bookings.length;
    const totalCommissions = employees.reduce((sum, emp) => sum + emp.totalCommission, 0);
    const totalAgentCommissions = employees.reduce((sum, emp) => sum + emp.agentCommission, 0);
    const totalCSCommissions = employees.reduce((sum, emp) => sum + emp.csCommission, 0);

    res.json({
      success: true,
      data: {
        month: Number(month),
        year: Number(year),
        employees,
        summary: {
          totalEmployees,
          totalBookings,
          totalCommissions,
          totalAgentCommissions,
          totalCSCommissions,
          avgCommissionPerEmployee: totalEmployees > 0 ? totalCommissions / totalEmployees : 0
        }
      }
    });
  } catch (error) {
    console.error('Error generating employee commission report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate employee commission report',
    });
  }
});

// Export employee commission report to Excel
router.get('/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { month, year, format } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }

    // For now, return JSON. You can implement Excel export using libraries like exceljs
    // This is a placeholder for the export functionality
    res.json({
      success: true,
      message: 'Export functionality will be implemented with Excel library',
      data: { month, year, format }
    });
  } catch (error) {
    console.error('Error exporting employee commission report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export employee commission report',
    });
  }
});

export default router;
