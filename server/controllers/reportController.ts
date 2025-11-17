import { Request, Response } from 'express';
import { reportService, ReportFilters } from '../services/reportService';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Advanced Report Controller
 */
export class ReportController {
  /**
   * Get financial summary
   */
  async getFinancialSummary(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      
      console.log('🎯 Controller getFinancialSummary called');
      console.log('  filters:', filters);
      
      // Direct calculation with correct date parsing
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      console.log('  Date range:', startDate, 'to', endDate);
      
      // Get CONFIRMED bookings
      const confirmedBookings = await prisma.bookings.findMany({
        where: {
          bookingDate: { gte: startDate, lte: endDate },
          status: 'CONFIRMED'
        },
        select: { saleInAED: true, costInAED: true, totalCommission: true }
      });
      
      // Get REFUNDED bookings
      const refundedBookings = await prisma.bookings.findMany({
        where: {
          bookingDate: { gte: startDate, lte: endDate },
          status: 'REFUNDED'
        },
        select: { bookingNumber: true, saleInAED: true, costInAED: true }
      });
      
      console.log('  Found', confirmedBookings.length, 'CONFIRMED and', refundedBookings.length, 'REFUNDED bookings');
      
      // Calculate
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.saleInAED) || 0), 0);
      const totalCost = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.costInAED) || 0), 0);
      const totalCommissions = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.totalCommission) || 0), 0);
      
      const totalRefunds = refundedBookings.reduce((sum, b) => sum + Math.abs(Number(b.saleInAED) || 0), 0);
      const refundCost = refundedBookings.reduce((sum, b) => sum + Math.abs(Number(b.costInAED) || 0), 0);
      
      const netRevenue = totalRevenue - totalRefunds;
      const netCost = totalCost - refundCost;
      const grossProfit = netRevenue - netCost;
      const netProfit = grossProfit - totalCommissions;
      const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100) : 0;
      
      console.log('💰 Results: totalRefunds=', totalRefunds, ', refundCost=', refundCost);
      
      const summary = {
        totalRevenue,
        totalRefunds,
        netRevenue,
        refundCost,
        totalCost,
        netCost,
        grossProfit,
        totalCommissions,
        netProfit,
        profitMargin,
        revenue: netRevenue,
        costs: netCost,
        operatingExpenses: totalCommissions,
        confirmedBookingsCount: confirmedBookings.length,
        refundedBookingsCount: refundedBookings.length,
        cashFlow: 0,
        receivables: 0,
        payables: 0,
        workingCapital: 0,
        ebitda: netProfit + totalCommissions,
        monthlyBreakdown: []
      };
      
      res.json({
        success: true,
        data: summary,
        filters
      });
    } catch (error) {
      console.error('Error getting financial summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate financial summary'
      });
    }
  }

  /**
   * Get revenue time series
   */
  async getRevenueTimeSeries(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const timeSeries = await reportService.getRevenueTimeSeries(filters);
      
      res.json({
        success: true,
        data: timeSeries,
        filters
      });
    } catch (error) {
      console.error('Error getting revenue time series:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate revenue time series'
      });
    }
  }

  /**
   * Get profit & loss statement
   */
  async getProfitLoss(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const statement = await reportService.getProfitLossStatement(filters);
      
      res.json({
        success: true,
        data: statement,
        filters
      });
    } catch (error) {
      console.error('Error getting P&L statement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate P&L statement'
      });
    }
  }

  /**
   * Get cash flow statement
   */
  async getCashFlow(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const statement = await reportService.getCashFlowStatement(filters);
      
      res.json({
        success: true,
        data: statement,
        filters
      });
    } catch (error) {
      console.error('Error getting cash flow statement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate cash flow statement'
      });
    }
  }

  /**
   * Get aging report
   */
  async getAgingReport(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const aging = await reportService.getAgingReport(filters);
      
      res.json({
        success: true,
        data: aging,
        filters
      });
    } catch (error) {
      console.error('Error getting aging report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate aging report'
      });
    }
  }

  /**
   * Get customer analysis
   */
  async getCustomerAnalysis(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const analysis = await reportService.getCustomerAnalysis(filters);
      
      res.json({
        success: true,
        data: analysis,
        filters
      });
    } catch (error) {
      console.error('Error getting customer analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate customer analysis'
      });
    }
  }

  /**
   * Get supplier performance
   */
  async getSupplierPerformance(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const performance = await reportService.getSupplierPerformance(filters);
      
      res.json({
        success: true,
        data: performance,
        filters
      });
    } catch (error) {
      console.error('Error getting supplier performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate supplier performance report'
      });
    }
  }

  /**
   * Get commissions breakdown
   */
  async getCommissions(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const commissions = await reportService.getCommissionsBreakdown(filters);
      
      res.json({
        success: true,
        data: commissions,
        filters
      });
    } catch (error) {
      console.error('Error getting commissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate commissions report'
      });
    }
  }

  /**
   * Get KPIs
   */
  async getKPIs(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const kpis = await reportService.getKPIs(filters);
      
      res.json({
        success: true,
        data: kpis,
        filters
      });
    } catch (error) {
      console.error('Error getting KPIs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate KPIs'
      });
    }
  }

  /**
   * Get booking performance
   */
  async getBookingPerformance(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const performance = await reportService.getBookingPerformance(filters);
      
      res.json({
        success: true,
        data: performance,
        filters
      });
    } catch (error) {
      console.error('Error getting booking performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate booking performance report'
      });
    }
  }

  /**
   * Get VAT report
   */
  async getVATReport(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      const vatReport = await reportService.getVATReport(filters);
      
      res.json({
        success: true,
        data: vatReport,
        filters
      });
    } catch (error) {
      console.error('Error getting VAT report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate VAT report'
      });
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(req: Request, res: Response) {
    try {
      const filters = this.parseFilters(req.query);
      
      // Fetch all data in parallel
      const [
        financialSummary,
        kpis,
        revenueTimeSeries,
        bookingPerformance,
        topCustomers,
        topSuppliers
      ] = await Promise.all([
        reportService.getFinancialSummary(filters),
        reportService.getKPIs(filters),
        reportService.getRevenueTimeSeries(filters),
        reportService.getBookingPerformance(filters),
        reportService.getCustomerAnalysis(filters).then(r => r.topCustomers),
        reportService.getSupplierPerformance(filters).then(r => r.topSuppliers)
      ]);

      res.json({
        success: true,
        data: {
          financialSummary,
          kpis,
          revenueTimeSeries,
          bookingPerformance,
          topCustomers,
          topSuppliers
        },
        filters
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate dashboard data'
      });
    }
  }

  /**
   * Get report by preset (today, this week, this month, this year, etc.)
   */
  async getReportByPreset(req: Request, res: Response) {
    try {
      const { preset, reportType } = req.params;
      const filters = this.getPresetDateRange(preset as any);
      
      let data;
      switch (reportType) {
        case 'financial':
          data = await reportService.getFinancialSummary(filters);
          break;
        case 'profit-loss':
          data = await reportService.getProfitLossStatement(filters);
          break;
        case 'cash-flow':
          data = await reportService.getCashFlowStatement(filters);
          break;
        case 'customer':
          data = await reportService.getCustomerAnalysis(filters);
          break;
        case 'supplier':
          data = await reportService.getSupplierPerformance(filters);
          break;
        case 'vat':
          data = await reportService.getVATReport(filters);
          break;
        case 'booking':
          data = await reportService.getBookingPerformance(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type'
          });
      }

      res.json({
        success: true,
        data,
        preset,
        filters
      });
    } catch (error) {
      console.error('Error getting report by preset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }

  /**
   * Compare two periods
   */
  async comparePeriods(req: Request, res: Response) {
    try {
      const { reportType } = req.params;
      const currentFilters = this.parseFilters(req.query);
      
      // Calculate comparison period
      const daysDiff = Math.ceil(
        (new Date(currentFilters.endDate).getTime() - new Date(currentFilters.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      const previousFilters: ReportFilters = {
        startDate: format(subDays(new Date(currentFilters.startDate), daysDiff), 'yyyy-MM-dd'),
        endDate: format(subDays(new Date(currentFilters.endDate), 1), 'yyyy-MM-dd')
      };

      let currentData, previousData;

      switch (reportType) {
        case 'financial':
          [currentData, previousData] = await Promise.all([
            reportService.getFinancialSummary(currentFilters),
            reportService.getFinancialSummary(previousFilters)
          ]);
          break;
        case 'booking':
          [currentData, previousData] = await Promise.all([
            reportService.getBookingPerformance(currentFilters),
            reportService.getBookingPerformance(previousFilters)
          ]);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type for comparison'
          });
      }

      res.json({
        success: true,
        data: {
          current: currentData,
          previous: previousData,
          comparison: this.calculateComparison(currentData, previousData)
        },
        filters: {
          current: currentFilters,
          previous: previousFilters
        }
      });
    } catch (error) {
      console.error('Error comparing periods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare periods'
      });
    }
  }

  // Helper methods

  private parseFilters(query: any): ReportFilters {
    const today = new Date();
    const startOfThisMonth = startOfMonth(today);
    
    return {
      startDate: query.startDate || query.dateFrom || format(startOfThisMonth, 'yyyy-MM-dd'),
      endDate: query.endDate || query.dateTo || format(today, 'yyyy-MM-dd'),
      customerId: query.customerId,
      supplierId: query.supplierId,
      employeeId: query.employeeId,
      status: query.status,
      category: query.category,
      currency: query.currency || 'AED',
      minAmount: query.minAmount ? parseFloat(query.minAmount) : undefined,
      maxAmount: query.maxAmount ? parseFloat(query.maxAmount) : undefined,
      groupBy: query.groupBy || 'month',
      compareWith: query.compareWith,
      includeForecasting: query.includeForecasting === 'true'
    };
  }

  private getPresetDateRange(preset: string): ReportFilters {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (preset) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = subDays(today, 1);
        endDate = subDays(today, 1);
        break;
      case 'last7days':
        startDate = subDays(today, 7);
        break;
      case 'last30days':
        startDate = subDays(today, 30);
        break;
      case 'thisWeek':
        startDate = subDays(today, today.getDay());
        break;
      case 'lastWeek':
        startDate = subDays(today, today.getDay() + 7);
        endDate = subDays(today, today.getDay() + 1);
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subDays(startOfMonth(today), 1));
        endDate = endOfMonth(subDays(startOfMonth(today), 1));
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        break;
      case 'lastYear':
        startDate = startOfYear(subDays(startOfYear(today), 1));
        endDate = endOfYear(subDays(startOfYear(today), 1));
        break;
      default:
        startDate = startOfMonth(today);
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  }

  private calculateComparison(current: any, previous: any) {
    const comparison: any = {};
    
    for (const key in current) {
      if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
        const change = current[key] - previous[key];
        const changePercentage = previous[key] !== 0 ? (change / previous[key]) * 100 : 0;
        
        comparison[key] = {
          current: current[key],
          previous: previous[key],
          change,
          changePercentage,
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    }
    
    return comparison;
  }
}

export const reportController = new ReportController();
