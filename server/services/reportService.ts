import { Prisma } from '@prisma/client';
import { addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { prisma } from '../lib/prisma';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilters extends DateRange {
  customerId?: string;
  supplierId?: string;
  employeeId?: string;
  status?: string;
  category?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  compareWith?: 'previous_period' | 'last_year' | 'custom';
  includeForecasting?: boolean;
}

export interface FinancialMetrics {
  revenue: number;
  totalRevenue?: number;
  totalRefunds?: number;
  refundCost?: number;
  netRevenue?: number;
  costs: number;
  totalCost?: number;
  netCost?: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  operatingExpenses: number;
  totalCommissions?: number;
  ebitda: number;
  cashFlow: number;
  receivables: number;
  payables: number;
  workingCapital: number;
}

export interface KPIMetric {
  name: string;
  value: number;
  target?: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export interface TimeSeriesData {
  period: string;
  value: number;
  count?: number;
  average?: number;
  metadata?: Record<string, any>;
}

/**
 * Advanced Financial Reports Service
 */
export class ReportService {
  /**
   * Generate comprehensive financial summary
   */
  async getFinancialSummary(filters: ReportFilters): Promise<FinancialMetrics> {
    const { startDate, endDate, currency = 'AED' } = filters;

    console.log('🎯 reportService.getFinancialSummary called');
    console.log('  startDate:', startDate);
    console.log('  endDate:', endDate);
    console.log('  Date objects:', new Date(startDate), 'to', new Date(endDate));

    // Get CONFIRMED bookings for revenue
    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'CONFIRMED'
      },
      select: { saleInAED: true, saleAmount: true, saleCurrency: true, costInAED: true, costAmount: true, costCurrency: true, totalCommission: true }
    });

    // Get REFUNDED bookings
    const refundedBookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'REFUNDED'
      },
      select: { saleInAED: true, saleAmount: true, saleCurrency: true, costInAED: true, costAmount: true, costCurrency: true }
    });

    // Calculate revenue from CONFIRMED bookings
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.saleInAED) || 0), 0);
    const totalCost = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.costInAED) || 0), 0);
    const totalCommissions = confirmedBookings.reduce((sum, b) => sum + Math.abs(Number(b.totalCommission) || 0), 0);

    // Calculate refunds from REFUNDED bookings
    const totalRefunds = refundedBookings.reduce((sum, b) => sum + Math.abs(Number(b.saleInAED) || 0), 0);
    const refundCost = refundedBookings.reduce((sum, b) => sum + Math.abs(Number(b.costInAED) || 0), 0);

    console.log('🎯 reportService.getFinancialSummary:');
    console.log('  Confirmed bookings:', confirmedBookings.length);
    console.log('  Refunded bookings:', refundedBookings.length);
    console.log('  totalRefunds:', totalRefunds);
    console.log('  refundCost:', refundCost);

    // Calculate net values
    const revenue = totalRevenue - totalRefunds;

    const netCost = totalCost - refundCost;
    const grossProfit = revenue - netCost;
    const netProfit = grossProfit - totalCommissions;
    const operatingExpenses = totalCommissions;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const ebitda = netProfit + operatingExpenses; // Simplified EBITDA

    // Calculate receivables (unpaid invoices)
    const invoices = await prisma.invoices.findMany({
      where: {
        invoiceDate: { gte: new Date(startDate), lte: new Date(endDate) },
        paymentStatus: { not: 'PAID' }
      },
      select: { totalAmount: true }
    });
    const receivables = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    // Calculate payables (unpaid supplier costs)
    const unpaidBookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        paymentStatus: { not: 'PAID' }
      },
      select: { supplierCost: true }
    });
    const payables = unpaidBookings.reduce((sum, b) => sum + (Number(b.supplierCost) || 0), 0);

    const workingCapital = receivables - payables;
    const cashFlow = revenue - netCost - operatingExpenses + (receivables - payables);

    return {
      revenue,
      totalRevenue,
      totalRefunds,
      netRevenue: revenue,
      refundCost,
      costs: netCost,
      totalCost,
      netCost,
      grossProfit,
      netProfit,
      profitMargin,
      operatingExpenses,
      totalCommissions,
      ebitda: netProfit + operatingExpenses,
      cashFlow,
      receivables,
      payables,
      workingCapital
    };
  }

  /**
   * Get revenue breakdown by period
   */
  async getRevenueTimeSeries(filters: ReportFilters): Promise<TimeSeriesData[]> {
    const { startDate, endDate, groupBy = 'month', currency = 'AED' } = filters;

    const receipts = await prisma.receipts.findMany({
      where: {
        receiptDate: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'POSTED',
        currency
      },
      select: { amount: true, receiptDate: true },
      orderBy: { receiptDate: 'asc' }
    });

    return this.groupByPeriod(receipts.map(r => ({
      date: r.receiptDate,
      value: Number(r.amount)
    })), groupBy);
  }

  /**
   * Get profit & loss statement
   */
  async getProfitLossStatement(filters: ReportFilters) {
    const metrics = await this.getFinancialSummary(filters);
    
    // Get detailed breakdown
    const { startDate, endDate } = filters;
    
    const revenueByCategory = await this.getRevenueByCategory(filters);
    const expensesByCategory = await this.getExpensesByCategory(filters);
    const commissions = await this.getCommissionsBreakdown(filters);
    
    return {
      period: { startDate, endDate },
      income: {
        revenue: metrics.revenue,
        breakdown: revenueByCategory
      },
      costOfGoodsSold: {
        total: metrics.costs,
        grossProfit: metrics.grossProfit,
        grossMargin: metrics.revenue > 0 ? (metrics.grossProfit / metrics.revenue) * 100 : 0
      },
      operatingExpenses: {
        total: metrics.operatingExpenses,
        commissions: commissions.total,
        breakdown: expensesByCategory
      },
      netIncome: {
        ebitda: metrics.ebitda,
        netProfit: metrics.netProfit,
        netMargin: metrics.profitMargin
      }
    };
  }

  /**
   * Get cash flow statement
   */
  async getCashFlowStatement(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    // Operating Activities
    const operatingCash = await this.getOperatingCashFlow(filters);
    
    // Get all cash receipts
    const receipts = await prisma.receipts.findMany({
      where: {
        receiptDate: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'POSTED'
      },
      select: { amount: true, paymentMethod: true }
    });

    const cashReceipts = receipts.filter(r => r.paymentMethod !== 'CREDIT').reduce((sum, r) => sum + Number(r.amount), 0);
    
    // Get all cash payments (from journal entries)
    const payments = await prisma.journalEntries.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'POSTED',
        transactionType: { in: ['BOOKING_COST', 'SUPPLIER_PAYMENT', 'EXPENSE', 'SALARY'] }
      },
      include: { lines: true }
    });

    const cashPayments = payments.reduce((sum, p) => 
      sum + p.lines.filter(l => l.type === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0), 0
    );

    return {
      period: { startDate, endDate },
      operatingActivities: {
        cashReceipts,
        cashPayments,
        netCashFromOperations: cashReceipts - cashPayments
      },
      investingActivities: {
        // Placeholder for future implementation
        capitalExpenditures: 0,
        netCashFromInvesting: 0
      },
      financingActivities: {
        // Placeholder for future implementation
        debtProceeds: 0,
        debtRepayments: 0,
        netCashFromFinancing: 0
      },
      netCashFlow: cashReceipts - cashPayments,
      beginningCash: 0, // To be calculated from previous period
      endingCash: cashReceipts - cashPayments
    };
  }

  /**
   * Get aging report for receivables
   */
  async getAgingReport(filters: ReportFilters) {
    const today = new Date();
    
    const invoices = await prisma.invoices.findMany({
      where: {
        paymentStatus: { not: 'PAID' }
      },
      include: {
        customer: { select: { id: true, name: true, email: true } }
      }
    });

    const aging = {
      current: [] as any[],      // 0-30 days
      overdue30: [] as any[],    // 31-60 days
      overdue60: [] as any[],    // 61-90 days
      overdue90: [] as any[]     // 90+ days
    };

    invoices.forEach(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const item = {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        amount: Number(inv.totalAmount),
        dueDate: dueDate,
        daysOverdue
      };

      if (daysOverdue <= 30) aging.current.push(item);
      else if (daysOverdue <= 60) aging.overdue30.push(item);
      else if (daysOverdue <= 90) aging.overdue60.push(item);
      else aging.overdue90.push(item);
    });

    return {
      summary: {
        current: aging.current.reduce((sum, i) => sum + i.amount, 0),
        overdue30: aging.overdue30.reduce((sum, i) => sum + i.amount, 0),
        overdue60: aging.overdue60.reduce((sum, i) => sum + i.amount, 0),
        overdue90: aging.overdue90.reduce((sum, i) => sum + i.amount, 0),
        total: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      },
      details: aging
    };
  }

  /**
   * Get customer analysis report
   */
  async getCustomerAnalysis(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const customers = await prisma.customers.findMany({
      include: {
        invoices: {
          where: {
            invoiceDate: { gte: new Date(startDate), lte: new Date(endDate) }
          },
          select: { totalAmount: true, paymentStatus: true }
        },
        receipts: {
          where: {
            receiptDate: { gte: new Date(startDate), lte: new Date(endDate) }
          },
          select: { amount: true }
        }
      }
    });

    const analysis = customers.map(customer => {
      const totalRevenue = customer.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalInvoiced = customer.invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
      const paidInvoices = customer.invoices.filter(i => i.paymentStatus === 'PAID').length;
      const totalInvoices = customer.invoices.length;
      const paymentRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalRevenue,
        totalInvoiced,
        totalInvoices,
        paidInvoices,
        paymentRate,
        averageInvoiceValue: totalInvoices > 0 ? totalInvoiced / totalInvoices : 0,
        lastPurchaseDate: customer.invoices[0]?.invoiceDate || null
      };
    });

    // Sort by revenue
    analysis.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      topCustomers: analysis.slice(0, 10),
      totalCustomers: customers.length,
      activeCustomers: analysis.filter(c => c.totalRevenue > 0).length,
      averageRevenuePerCustomer: analysis.reduce((sum, c) => sum + c.totalRevenue, 0) / customers.length,
      all: analysis
    };
  }

  /**
   * Get supplier performance report
   */
  async getSupplierPerformance(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const suppliers = await prisma.suppliers.findMany({
      include: {
        bookings: {
          where: {
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
          },
          select: { 
            supplierCost: true, 
            status: true,
            serviceType: true
          }
        }
      }
    });

    const performance = suppliers.map(supplier => {
      const totalCost = supplier.bookings.reduce((sum, b) => sum + Number(b.supplierCost), 0);
      const totalBookings = supplier.bookings.length;
      const confirmedBookings = supplier.bookings.filter(b => b.status === 'CONFIRMED').length;
      const confirmationRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

      return {
        supplierId: supplier.id,
        supplierName: supplier.companyName || supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        totalCost,
        totalBookings,
        confirmedBookings,
        confirmationRate,
        averageCost: totalBookings > 0 ? totalCost / totalBookings : 0,
        serviceTypes: [...new Set(supplier.bookings.map(b => b.serviceType))]
      };
    });

    performance.sort((a, b) => b.totalCost - a.totalCost);

    return {
      topSuppliers: performance.slice(0, 10),
      totalSuppliers: suppliers.length,
      totalSpent: performance.reduce((sum, s) => sum + s.totalCost, 0),
      averageSpentPerSupplier: performance.reduce((sum, s) => sum + s.totalCost, 0) / suppliers.length,
      all: performance
    };
  }

  /**
   * Get commission report
   */
  async getCommissionsBreakdown(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const commissions = await prisma.journalEntries.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'POSTED',
        transactionType: { in: ['COMMISSION_AGENT', 'COMMISSION_CS'] }
      },
      include: {
        lines: true,
        booking: {
          include: {
            assignedAgent: { select: { id: true, name: true, email: true } },
            assignedCS: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const byEmployee = new Map<string, { name: string; total: number; count: number; type: string }>();

    commissions.forEach(comm => {
      const amount = comm.lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + Number(l.amount), 0);
      
      const employee = comm.transactionType === 'COMMISSION_AGENT' 
        ? comm.booking?.assignedAgent 
        : comm.booking?.assignedCS;

      if (employee) {
        const key = employee.id;
        const existing = byEmployee.get(key) || { name: employee.name, total: 0, count: 0, type: comm.transactionType };
        existing.total += amount;
        existing.count += 1;
        byEmployee.set(key, existing);
      }
    });

    const breakdown = Array.from(byEmployee.entries()).map(([id, data]) => ({
      employeeId: id,
      employeeName: data.name,
      type: data.type === 'COMMISSION_AGENT' ? 'Agent' : 'Customer Service',
      totalCommission: data.total,
      bookingCount: data.count,
      averageCommission: data.total / data.count
    }));

    breakdown.sort((a, b) => b.totalCommission - a.totalCommission);

    return {
      total: commissions.reduce((sum, c) => 
        sum + c.lines.filter(l => l.type === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0), 0
      ),
      byEmployee: breakdown,
      agentCommissions: breakdown.filter(b => b.type === 'Agent').reduce((sum, b) => sum + b.totalCommission, 0),
      csCommissions: breakdown.filter(b => b.type === 'Customer Service').reduce((sum, b) => sum + b.totalCommission, 0)
    };
  }

  /**
   * Get KPIs with trends
   */
  async getKPIs(filters: ReportFilters): Promise<KPIMetric[]> {
    const currentMetrics = await this.getFinancialSummary(filters);
    
    // Calculate previous period for comparison
    const daysDiff = Math.ceil((new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const previousFilters: ReportFilters = {
      startDate: format(subDays(new Date(filters.startDate), daysDiff), 'yyyy-MM-dd'),
      endDate: format(subDays(new Date(filters.endDate), 1), 'yyyy-MM-dd')
    };
    
    const previousMetrics = await this.getFinancialSummary(previousFilters);

    const createKPI = (name: string, current: number, previous: number, target?: number): KPIMetric => {
      const change = current - previous;
      const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
      
      let status: 'good' | 'warning' | 'critical' = 'good';
      if (target) {
        const achievementRate = (current / target) * 100;
        if (achievementRate < 70) status = 'critical';
        else if (achievementRate < 90) status = 'warning';
      }

      return { name, value: current, target, change, changePercentage, trend, status };
    };

    return [
      createKPI('Total Revenue', currentMetrics.revenue, previousMetrics.revenue, currentMetrics.revenue * 1.2),
      createKPI('Net Profit', currentMetrics.netProfit, previousMetrics.netProfit, currentMetrics.revenue * 0.3),
      createKPI('Profit Margin %', currentMetrics.profitMargin, previousMetrics.profitMargin, 30),
      createKPI('Operating Expenses', currentMetrics.operatingExpenses, previousMetrics.operatingExpenses),
      createKPI('Cash Flow', currentMetrics.cashFlow, previousMetrics.cashFlow),
      createKPI('Receivables', currentMetrics.receivables, previousMetrics.receivables),
      createKPI('Working Capital', currentMetrics.workingCapital, previousMetrics.workingCapital)
    ];
  }

  /**
   * Get booking performance metrics
   */
  async getBookingPerformance(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const bookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      include: {
        file: { select: { customer: { select: { name: true } } } },
        assignedAgent: { select: { name: true } }
      }
    });

    const byStatus = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byServiceType = bookings.reduce((acc, b) => {
      acc[b.serviceType] = (acc[b.serviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.sellingPrice), 0);
    const totalCost = bookings.reduce((sum, b) => sum + Number(b.supplierCost), 0);
    const totalProfit = totalRevenue - totalCost;

    return {
      summary: {
        totalBookings: bookings.length,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0
      },
      byStatus,
      byServiceType,
      topServices: Object.entries(byServiceType).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5)
    };
  }

  /**
   * Get VAT report
   */
  async getVATReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const invoices = await prisma.invoices.findMany({
      where: {
        invoiceDate: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      select: {
        subtotal: true,
        vatAmount: true,
        totalAmount: true,
        vatRate: true
      }
    });

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);
    const totalVATCollected = invoices.reduce((sum, inv) => sum + Number(inv.vatAmount), 0);
    
    // VAT paid on purchases (from bookings)
    const bookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      select: { supplierCost: true }
    });

    // Assuming 5% VAT on purchases
    const totalPurchases = bookings.reduce((sum, b) => sum + Number(b.supplierCost), 0);
    const totalVATPaid = totalPurchases * 0.05;
    
    const netVATPayable = totalVATCollected - totalVATPaid;

    return {
      period: { startDate, endDate },
      sales: {
        totalSales,
        vatCollected: totalVATCollected,
        totalWithVAT: totalSales + totalVATCollected
      },
      purchases: {
        totalPurchases,
        vatPaid: totalVATPaid,
        totalWithVAT: totalPurchases + totalVATPaid
      },
      netVATPayable,
      details: {
        invoiceCount: invoices.length,
        purchaseCount: bookings.length,
        averageVATRate: invoices.length > 0 ? 
          invoices.reduce((sum, inv) => sum + Number(inv.vatRate), 0) / invoices.length : 0
      }
    };
  }

  // Helper methods

  private async getRevenueByCategory(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    
    const bookings = await prisma.bookings.findMany({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      },
      select: { serviceType: true, sellingPrice: true }
    });

    const byCategory = bookings.reduce((acc, b) => {
      const cat = b.serviceType || 'OTHER';
      acc[cat] = (acc[cat] || 0) + Number(b.sellingPrice);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  }

  private async getExpensesByCategory(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    
    const entries = await prisma.journalEntries.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'POSTED',
        transactionType: { in: ['EXPENSE', 'SALARY', 'COMMISSION_AGENT', 'COMMISSION_CS'] }
      },
      include: { lines: true }
    });

    const byCategory = entries.reduce((acc, e) => {
      const cat = e.transactionType;
      const amount = e.lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + Number(l.amount), 0);
      acc[cat] = (acc[cat] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  }

  private async getOperatingCashFlow(filters: ReportFilters): Promise<number> {
    const metrics = await this.getFinancialSummary(filters);
    return metrics.netProfit + (metrics.receivables - metrics.payables);
  }

  private groupByPeriod(data: { date: Date; value: number }[], groupBy: string): TimeSeriesData[] {
    const grouped = new Map<string, { value: number; count: number }>();

    data.forEach(item => {
      let key: string;
      const date = new Date(item.date);

      switch (groupBy) {
        case 'day':
          key = format(date, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(date, 'yyyy-ww');
          break;
        case 'month':
          key = format(date, 'yyyy-MM');
          break;
        case 'quarter':
          key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
          break;
        case 'year':
          key = format(date, 'yyyy');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }

      const existing = grouped.get(key) || { value: 0, count: 0 };
      existing.value += item.value;
      existing.count += 1;
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        value: data.value,
        count: data.count,
        average: data.value / data.count
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }
}

export const reportService = new ReportService();
