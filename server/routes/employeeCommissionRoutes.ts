import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get monthly employee commission report
router.get('/employee-commissions', authenticateToken, async (req: Request, res: Response) => {
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

    // Get all bookings for the period with employee and customer data
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'REFUND']
        }
      },
      include: {
        bookingAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        customerService: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate exchange rates (you might want to get these from your currency service)
    const exchangeRates: Record<string, number> = {
      USD: 3.67,
      EUR: 4.10,
      GBP: 4.75,
      SAR: 0.98,
      AED: 1.00,
    };

    // Helper function to convert to AED
    const convertToAED = (amount: number, currency: string): number => {
      const rate = exchangeRates[currency] || 1;
      return amount * rate;
    };

    // Process employee commissions
    const employeeMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      role: string;
      totalBookings: number;
      totalCommission: number;
      agentCommission: number;
      csCommission: number;
      totalCommissionRate: number;
      bookings: any[];
    }>();

    for (const booking of bookings) {
      const saleAmountAED = convertToAED(booking.saleAmount, booking.saleCurrency);
      const vatApplicable = booking.vatApplicable;
      const baseAmount = vatApplicable ? saleAmountAED / 1.05 : saleAmountAED;

      // Process booking agent commission
      if (booking.bookingAgent && booking.agentCommissionRate) {
        const agentId = booking.bookingAgent.id;
        const agentName = `${booking.bookingAgent.firstName} ${booking.bookingAgent.lastName}`;
        const commissionAmount = baseAmount * (booking.agentCommissionRate / 100);

        if (!employeeMap.has(agentId)) {
          employeeMap.set(agentId, {
            employeeId: agentId,
            employeeName: agentName,
            role: booking.bookingAgent.role,
            totalBookings: 0,
            totalCommission: 0,
            agentCommission: 0,
            csCommission: 0,
            totalCommissionRate: 0,
            bookings: [],
          });
        }

        const employee = employeeMap.get(agentId)!;
        employee.totalBookings++;
        employee.totalCommission += commissionAmount;
        employee.agentCommission += commissionAmount;
        employee.totalCommissionRate += booking.agentCommissionRate;
        employee.bookings.push({
          bookingId: booking.id,
          bookingDate: booking.createdAt,
          customerName: booking.customer?.name || 'N/A',
          serviceType: booking.serviceType,
          saleAmount: booking.saleAmount,
          saleCurrency: booking.saleCurrency,
          saleAmountAED: saleAmountAED,
          commissionType: 'agent',
          commissionRate: booking.agentCommissionRate,
          commissionAmount: commissionAmount,
          vatAmount: vatApplicable ? saleAmountAED - baseAmount : 0,
          status: booking.status,
        });
      }

      // Process customer service commission
      if (booking.customerService && booking.csCommissionRate) {
        const csId = booking.customerService.id;
        const csName = `${booking.customerService.firstName} ${booking.customerService.lastName}`;
        const commissionAmount = baseAmount * (booking.csCommissionRate / 100);

        if (!employeeMap.has(csId)) {
          employeeMap.set(csId, {
            employeeId: csId,
            employeeName: csName,
            role: booking.customerService.role,
            totalBookings: 0,
            totalCommission: 0,
            agentCommission: 0,
            csCommission: 0,
            totalCommissionRate: 0,
            bookings: [],
          });
        }

        const employee = employeeMap.get(csId)!;
        employee.totalBookings++;
        employee.totalCommission += commissionAmount;
        employee.csCommission += commissionAmount;
        employee.totalCommissionRate += booking.csCommissionRate;
        employee.bookings.push({
          bookingId: booking.id,
          bookingDate: booking.createdAt,
          customerName: booking.customer?.name || 'N/A',
          serviceType: booking.serviceType,
          saleAmount: booking.saleAmount,
          saleCurrency: booking.saleCurrency,
          saleAmountAED: saleAmountAED,
          commissionType: 'cs',
          commissionRate: booking.csCommissionRate,
          commissionAmount: commissionAmount,
          vatAmount: vatApplicable ? saleAmountAED - baseAmount : 0,
          status: booking.status,
        });
      }
    }

    // Convert map to array and calculate averages
    const employees = Array.from(employeeMap.values()).map((emp) => ({
      ...emp,
      avgCommissionRate: emp.totalBookings > 0 ? emp.totalCommissionRate / emp.totalBookings : 0,
    }));

    // Calculate totals and summary
    const totalEmployees = employees.length;
    const totalBookings = bookings.length;
    const totalCommissions = employees.reduce((sum, emp) => sum + emp.totalCommission, 0);
    const totalAgentCommissions = employees.reduce((sum, emp) => sum + emp.agentCommission, 0);
    const totalCSCommissions = employees.reduce((sum, emp) => sum + emp.csCommission, 0);

    const sortedByCommission = [...employees].sort((a, b) => b.totalCommission - a.totalCommission);
    const highestEarner = sortedByCommission[0] || { employeeName: 'N/A', totalCommission: 0 };
    const lowestEarner = sortedByCommission[sortedByCommission.length - 1] || { employeeName: 'N/A', totalCommission: 0 };

    const report = {
      month: Number(month),
      year: Number(year),
      totalEmployees,
      totalBookings,
      totalCommissions,
      totalAgentCommissions,
      totalCSCommissions,
      employees,
      summary: {
        highestEarner: {
          name: highestEarner.employeeName,
          amount: highestEarner.totalCommission,
        },
        lowestEarner: {
          name: lowestEarner.employeeName,
          amount: lowestEarner.totalCommission,
        },
        avgCommissionPerEmployee: totalEmployees > 0 ? totalCommissions / totalEmployees : 0,
        avgCommissionPerBooking: totalBookings > 0 ? totalCommissions / totalBookings : 0,
      },
    };

    res.json({
      success: true,
      data: report,
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
router.get('/employee-commissions/export', authenticateToken, async (req: Request, res: Response) => {
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
