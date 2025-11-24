import { Hono } from 'hono';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const reports = new Hono();
reports.use('*', authenticate, requirePermission('viewFinancialReports'));

// Exchange rates helper functions
const exchangeRates: Record<string, number> = {
  AED: 1.00,
  USD: 3.67, EUR: 4.10, GBP: 4.75, CHF: 4.15, CAD: 2.65, AUD: 2.38, NZD: 2.18,
  SAR: 0.98, KWD: 12.05, QAR: 1.01, BHD: 9.73, OMR: 9.54,
  EGP: 0.075, JOD: 5.17, LBP: 0.00004, TRY: 0.11, IQD: 0.0028, SYP: 0.00014,
  YER: 0.015, ILS: 1.02, MAD: 0.37, TND: 1.18, DZD: 0.027, LYD: 0.76,
  SDG: 0.0061, IRR: 0.000087, AFN: 0.053,
  INR: 0.044, PKR: 0.013, BDT: 0.031, PHP: 0.063, IDR: 0.00023, MYR: 0.82,
  SGD: 2.73, THB: 0.106, VND: 0.00015, CNY: 0.51, JPY: 0.024, KRW: 0.0028,
  AZN: 2.16, GEL: 1.33,
  SEK: 0.35, NOK: 0.34, DKK: 0.55, PLN: 0.92, CZK: 0.16, HUF: 0.010, RUB: 0.038,
  ZAR: 0.20, NGN: 0.0024, KES: 0.028, GHS: 0.24, TZS: 0.0014, UGX: 0.00098,
  ETB: 0.029,
  BRL: 0.63, MXN: 0.18, ARS: 0.0037, CLP: 0.0038, COP: 0.00084, PEN: 0.97
};

const convertToAED = (amount: number, currency: string): number => {
  return amount * (exchangeRates[currency] || 1);
};

const convertFromAED = (amountInAED: number, targetCurrency: string): number => {
  if (targetCurrency === 'AED') return amountInAED;
  const rate = exchangeRates[targetCurrency] || 1;
  return amountInAED / rate;
};

// Financial Summary Report (with refunds support)
reports.get('/financial-summary', async (c) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    // Normalize date range to full days
    const startDate = dateFrom ? new Date(dateFrom) : new Date('2020-01-01');
    startDate.setHours(0, 0, 0, 0);
    const endDate = dateTo ? new Date(dateTo) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // Get CONFIRMED bookings
    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      },
      orderBy: { bookingDate: 'asc' }
    });

    // Get REFUNDED bookings
    const refundedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'REFUNDED'
      },
      orderBy: { bookingDate: 'asc' }
    });

    // Calculate Revenue from CONFIRMED bookings
    let totalRevenue = 0;
    let totalCost = 0;
    let totalCommissions = 0;

    confirmedBookings.forEach(b => {
      const saleInAED = b.saleInAED || convertToAED(Number(b.saleAmount) || 0, b.saleCurrency || 'AED');
      const costInAED = b.costInAED || convertToAED(Number(b.costAmount) || 0, b.costCurrency || 'AED');
      totalRevenue += Math.abs(saleInAED);
      totalCost += Math.abs(costInAED);
      totalCommissions += Math.abs(Number(b.totalCommission) || 0);
    });

    // Calculate Refunds from REFUNDED bookings
    let totalRefunds = 0;
    let refundCost = 0;

    refundedBookings.forEach(b => {
      const saleInAED = b.saleInAED || convertToAED(Number(b.saleAmount) || 0, b.saleCurrency || 'AED');
      const costInAED = b.costInAED || convertToAED(Number(b.costAmount) || 0, b.costCurrency || 'AED');
      totalRefunds += Math.abs(saleInAED);
      refundCost += Math.abs(costInAED);
    });

    // Calculate Net values
    const netRevenue = totalRevenue - totalRefunds;
    const netCost = totalCost - refundCost;
    const grossProfit = netRevenue - netCost;
    const netProfit = grossProfit - totalCommissions;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100) : 0;

    // Monthly breakdown
    const monthlyData: Record<string, any> = {};
    
    confirmedBookings.forEach(b => {
      const monthKey = b.bookingDate.toISOString().substring(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, refunds: 0, cost: 0, refundCost: 0, commissions: 0, bookings: 0 };
      }
      const saleInAED = b.saleInAED || convertToAED(Number(b.saleAmount) || 0, b.saleCurrency || 'AED');
      const costInAED = b.costInAED || convertToAED(Number(b.costAmount) || 0, b.costCurrency || 'AED');
      monthlyData[monthKey].revenue += Math.abs(saleInAED);
      monthlyData[monthKey].cost += Math.abs(costInAED);
      monthlyData[monthKey].commissions += Math.abs(Number(b.totalCommission) || 0);
      monthlyData[monthKey].bookings += 1;
    });

    refundedBookings.forEach(b => {
      const monthKey = b.bookingDate.toISOString().substring(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, refunds: 0, cost: 0, refundCost: 0, commissions: 0, bookings: 0 };
      }
      const saleInAED = b.saleInAED || convertToAED(Number(b.saleAmount) || 0, b.saleCurrency || 'AED');
      const costInAED = b.costInAED || convertToAED(Number(b.costAmount) || 0, b.costCurrency || 'AED');
      monthlyData[monthKey].refunds += Math.abs(saleInAED);
      monthlyData[monthKey].refundCost += Math.abs(costInAED);
    });

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
      Month: month,
      Revenue: convertFromAED(data.revenue, currency),
      Refunds: convertFromAED(data.refunds, currency),
      'Net Revenue': convertFromAED(data.revenue - data.refunds, currency),
      Cost: convertFromAED(data.cost, currency),
      'Refund Cost': convertFromAED(data.refundCost, currency),
      'Net Cost': convertFromAED(data.cost - data.refundCost, currency),
      'Gross Profit': convertFromAED((data.revenue - data.refunds) - (data.cost - data.refundCost), currency),
      Commissions: convertFromAED(data.commissions, currency),
      'Net Profit': convertFromAED((data.revenue - data.refunds) - (data.cost - data.refundCost) - data.commissions, currency),
      Bookings: data.bookings
    }));

    return c.json({ 
      success: true, 
      data: {
        totalRevenue: convertFromAED(totalRevenue, currency),
        totalRefunds: convertFromAED(totalRefunds, currency),
        netRevenue: convertFromAED(netRevenue, currency),
        totalCost: convertFromAED(totalCost, currency),
        refundCost: convertFromAED(refundCost, currency),
        netCost: convertFromAED(netCost, currency),
        grossProfit: convertFromAED(grossProfit, currency),
        totalCommissions: convertFromAED(totalCommissions, currency),
        netProfit: convertFromAED(netProfit, currency),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        monthlyBreakdown,
        confirmedBookingsCount: confirmedBookings.length,
        refundedBookingsCount: refundedBookings.length
      }
    });
  } catch (error: any) {
    console.error('Error generating financial summary:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Report types: financial, bookings, invoices, commissions
reports.get('/financial', async (c) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    const [invoices, receipts, bookings] = await Promise.all([
      prisma.invoices.findMany({
        where: {
          invoiceDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined },
          currency: currency || undefined
        },
        select: { totalAmount: true, invoiceDate: true }
      }),
      prisma.receipts.findMany({
        where: {
          receiptDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined },
          status: 'COMPLETED'
        },
        select: { amount: true, receiptDate: true }
      }),
      prisma.bookings.findMany({
        where: {
          bookingDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined },
          status: { in: ['CONFIRMED', 'REFUND'] }
        },
        select: { 
          saleAmount: true, 
          saleCurrency: true,
          costAmount: true, 
          costCurrency: true,
          netProfit: true,
          totalCommission: true,
          bookingDate: true
        }
      })
    ]);
    
    // Calculate totals
    // Use bookings saleAmount for revenue (not just receipts)
    const revenue = bookings.reduce((sum, b) => {
      const sale = Number(b.saleAmount);
      return sum + (isNaN(sale) ? 0 : sale);
    }, 0);
    
    const expenses = bookings.reduce((sum, b) => {
      const cost = Number(b.costAmount);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
    
    const commissions = bookings.reduce((sum, b) => {
      const comm = Number(b.totalCommission);
      return sum + (isNaN(comm) ? 0 : comm);
    }, 0);
    
    // Also track actual cash received from receipts
    const cashReceived = receipts.reduce((sum, r) => {
      const amount = Number(r.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const grossProfit = revenue - expenses;
    const netProfit = grossProfit - commissions;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    // Debugging
    console.log('📊 Financial Report:', {
      receiptsCount: receipts.length,
      bookingsCount: bookings.length,
      revenue,
      cashReceived,
      expenses,
      commissions,
      grossProfit,
      netProfit,
      profitMargin
    });
    
    return c.json({ 
      success: true, 
      data: {
        totalRevenue: revenue || 0,
        totalCost: expenses || 0,
        grossProfit: grossProfit || 0,
        totalCommissions: commissions || 0,
        netProfit: netProfit || 0,
        profitMargin: profitMargin || 0,
        totalInvoices: invoices.length,
        totalReceipts: receipts.length,
        totalBookings: bookings.length
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.get('/bookings', async (c) => {
  try {
    const { startDate, endDate, status } = c.req.query();
    
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
        status: status || undefined
      },
      include: { customers: true, suppliers: true }
    });
    
    return c.json({ success: true, data: bookings });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.get('/invoices', async (c) => {
  try {
    const { startDate, endDate, status } = c.req.query();
    
    const invoices = await prisma.invoices.findMany({
      where: {
        date: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined },
        status: status || undefined
      },
      include: { customers: true }
    });
    
    const total = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    
    return c.json({ success: true, data: { invoices, stats: { total, paid, pending: total - paid } } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.get('/employee-commission', async (c) => {
  try {
    const { employeeId, startDate, endDate } = c.req.query();
    
    const commissions = await prisma.employee_commissions.findMany({
      where: {
        employeeId: employeeId || undefined,
        createdAt: { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined }
      },
      include: {
        employees: { include: { users: true } },
        bookings: true
      }
    });
    
    const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    
    return c.json({ success: true, data: { commissions, stats: { total, count: commissions.length } } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Profit & Loss Report
reports.get('/profit-loss', async (c) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined },
        status: { in: ['CONFIRMED', 'REFUND'] }
      },
      select: { 
        saleAmount: true,
        costAmount: true,
        netProfit: true,
        totalCommission: true,
        bookingDate: true
      }
    });
    
    // Calculate totals
    const revenue = bookings.reduce((sum, b) => sum + (Number(b.saleAmount) || 0), 0);
    const costOfSales = bookings.reduce((sum, b) => sum + (Number(b.costAmount) || 0), 0);
    const grossProfit = revenue - costOfSales;
    
    const operatingExpenses = bookings.reduce((sum, b) => sum + (Number(b.totalCommission) || 0), 0);
    const netIncome = grossProfit - operatingExpenses;
    
    return c.json({ 
      success: true, 
      data: {
        totalRevenue: revenue || 0,
        totalCost: costOfSales || 0,
        grossProfit: grossProfit || 0,
        totalCommissions: operatingExpenses || 0,
        netProfit: netIncome || 0,
        profitMargin: revenue > 0 ? ((netIncome / revenue) * 100).toFixed(2) : '0.00'
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Cash Flow Report
reports.get('/cash-flow', async (c) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    const [receipts, payments] = await Promise.all([
      prisma.receipts.findMany({
        where: {
          receiptDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined },
          status: 'COMPLETED'
        },
        select: { amount: true, receiptDate: true, paymentMethod: true }
      }),
      prisma.payments.findMany({
        where: {
          paymentDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: { amount: true, paymentDate: true, paymentMethod: true }
      })
    ]);
    
    // Calculate cash inflows and outflows
    const totalInflows = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalOutflows = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const netCashFlow = totalInflows - totalOutflows;
    
    return c.json({ 
      success: true, 
      data: {
        totalInflows: totalInflows || 0,
        totalOutflows: totalOutflows || 0,
        netCashFlow: netCashFlow || 0,
        receiptsCount: receipts.length,
        paymentsCount: payments.length
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Customer Statement Report
reports.get('/customer-statement/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    // Helper function to convert amount to target currency
    const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
      if (fromCurrency === toCurrency) return amount;
      
      // Get exchange rates from currencies table (all rates are to AED)
      const [fromCurrencyData, toCurrencyData] = await Promise.all([
        prisma.currencies.findUnique({
          where: { code: fromCurrency },
          select: { exchangeRateToAED: true }
        }),
        prisma.currencies.findUnique({
          where: { code: toCurrency },
          select: { exchangeRateToAED: true }
        })
      ]);
      
      if (!fromCurrencyData || !toCurrencyData) {
        // If currency not found, return original amount
        return amount;
      }
      
      // Convert: amount in fromCurrency -> AED -> toCurrency
      const amountInAED = amount * Number(fromCurrencyData.exchangeRateToAED);
      const convertedAmount = amountInAED / Number(toCurrencyData.exchangeRateToAED);
      
      return convertedAmount;
    };
    
    const [customer, invoices, receipts, bookings] = await Promise.all([
      prisma.customers.findUnique({
        where: { id: customerId },
        select: { 
          firstName: true, 
          lastName: true, 
          companyName: true,
          email: true,
          phone: true
        }
      }),
      prisma.invoices.findMany({
        where: {
          customerId,
          invoiceDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: {
          invoiceNumber: true,
          invoiceDate: true,
          totalAmount: true,
          status: true,
          currency: true,
          bookingId: true
        },
        orderBy: { invoiceDate: 'asc' }
      }),
      prisma.receipts.findMany({
        where: {
          customerId,
          receiptDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: {
          receiptNumber: true,
          receiptDate: true,
          amount: true,
          paymentMethod: true
        },
        orderBy: { receiptDate: 'asc' }
      }),
      prisma.bookings.findMany({
        where: {
          customerId,
          bookingDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: {
          id: true,
          bookingNumber: true,
          bookingDate: true,
          saleAmount: true,
          saleCurrency: true,
          serviceType: true,
          serviceDetails: true
        },
        orderBy: { bookingDate: 'asc' }
      })
    ]);
    
    if (!customer) {
      return c.json({ success: false, error: 'Customer not found' }, 404);
    }
    
    // Create transactions array combining all data (converted to target currency)
    const transactions: any[] = [];
    
    // Create a map of invoices by bookingId
    const invoicesByBooking = new Map();
    invoices.forEach(inv => {
      if (inv.bookingId) {
        invoicesByBooking.set(inv.bookingId, inv.invoiceNumber);
      }
    });
    
    // Add bookings as debit transactions with their invoice numbers
    for (const booking of bookings) {
      const convertedAmount = await convertCurrency(
        Number(booking.saleAmount) || 0, 
        booking.saleCurrency || 'AED', 
        currency
      );
      
      // Parse serviceDetails to get hotel name or other service info
      let serviceDetailsStr = '';
      try {
        const details = JSON.parse(booking.serviceDetails || '{}');
        if (booking.serviceType === 'HOTEL' && details.hotelName) {
          serviceDetailsStr = details.hotelName;
        } else if (booking.serviceType === 'FLIGHT' && details.airline) {
          serviceDetailsStr = details.airline;
        } else if (details.name) {
          serviceDetailsStr = details.name;
        }
      } catch (e) {
        // If serviceDetails is not valid JSON, ignore
      }
      
      const invoiceNumber = invoicesByBooking.get(booking.id);
      
      transactions.push({
        date: booking.bookingDate,
        type: 'Booking',
        reference: booking.bookingNumber,
        description: `${booking.serviceType} - Service booking`,
        serviceDetails: serviceDetailsStr,
        bookingId: booking.id,
        invoiceId: invoiceNumber || '',
        debit: convertedAmount,
        credit: 0,
        balance: 0, // Will be calculated later
        currency: currency
      });
    }
    
    // Add receipts as credit transactions (assume receipts are in target currency)
    for (const receipt of receipts) {
      transactions.push({
        date: receipt.receiptDate,
        type: 'Receipt',
        reference: receipt.receiptNumber,
        description: `Payment received via ${receipt.paymentMethod}`,
        serviceDetails: '',
        debit: 0,
        credit: Number(receipt.amount) || 0,
        balance: 0, // Will be calculated later
        currency: currency
      });
    }
    
    // Sort all transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate running balance
    let balance = 0;
    transactions.forEach(t => {
      balance += (t.debit - t.credit);
      t.balance = balance;
    });
    
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = totalDebit - totalCredit;
    
    return c.json({ 
      success: true, 
      data: {
        customer: {
          name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone
        },
        summary: {
          openingBalance: 0,
          totalDebit,
          totalCredit,
          closingBalance
        },
        transactions
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Supplier Statement Report
reports.get('/supplier-statement/:supplierId', async (c) => {
  try {
    const supplierId = c.req.param('supplierId');
    const { dateFrom, dateTo, currency = 'AED' } = c.req.query();
    
    // Helper function to convert amount to target currency
    const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
      if (fromCurrency === toCurrency) return amount;
      
      // Get exchange rates from currencies table (all rates are to AED)
      const [fromCurrencyData, toCurrencyData] = await Promise.all([
        prisma.currencies.findUnique({
          where: { code: fromCurrency },
          select: { exchangeRateToAED: true }
        }),
        prisma.currencies.findUnique({
          where: { code: toCurrency },
          select: { exchangeRateToAED: true }
        })
      ]);
      
      if (!fromCurrencyData || !toCurrencyData) {
        return amount;
      }
      
      // Convert: amount in fromCurrency -> AED -> toCurrency
      const amountInAED = amount * Number(fromCurrencyData.exchangeRateToAED);
      const convertedAmount = amountInAED / Number(toCurrencyData.exchangeRateToAED);
      
      return convertedAmount;
    };
    
    const [supplier, payments, bookings] = await Promise.all([
      prisma.suppliers.findUnique({
        where: { id: supplierId },
        select: { 
          companyName: true,
          email: true,
          phone: true,
          contactPerson: true
        }
      }),
      prisma.payments.findMany({
        where: {
          supplierId,
          paymentDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: {
          paymentNumber: true,
          paymentDate: true,
          amount: true,
          paymentMethod: true
        },
        orderBy: { paymentDate: 'asc' }
      }),
      prisma.bookings.findMany({
        where: {
          supplierId,
          bookingDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        },
        select: {
          id: true,
          bookingNumber: true,
          bookingDate: true,
          costAmount: true,
          costCurrency: true,
          serviceType: true,
          serviceDetails: true,
          customers: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          }
        },
        orderBy: { bookingDate: 'asc' }
      })
    ]);
    
    if (!supplier) {
      return c.json({ success: false, error: 'Supplier not found' }, 404);
    }
    
    // Create transactions array combining all data (converted to target currency)
    const transactions: any[] = [];
    
    // Add bookings as credit transactions (we owe supplier)
    for (const booking of bookings) {
      const convertedAmount = await convertCurrency(
        Number(booking.costAmount) || 0, 
        booking.costCurrency || 'AED', 
        currency
      );
      const customerName = booking.customers.companyName || `${booking.customers.firstName} ${booking.customers.lastName}`;
      
      // Parse serviceDetails to get hotel name or other service info
      let serviceDetailsStr = '';
      try {
        const details = JSON.parse(booking.serviceDetails || '{}');
        if (booking.serviceType === 'HOTEL' && details.hotelName) {
          serviceDetailsStr = details.hotelName;
        } else if (booking.serviceType === 'FLIGHT' && details.airline) {
          serviceDetailsStr = details.airline;
        } else if (details.name) {
          serviceDetailsStr = details.name;
        }
      } catch (e) {
        // If serviceDetails is not valid JSON, ignore
      }
      
      transactions.push({
        date: booking.bookingDate,
        type: 'Booking',
        reference: booking.bookingNumber,
        description: `${booking.serviceType} - ${customerName}`,
        serviceDetails: serviceDetailsStr,
        bookingId: booking.id,
        debit: 0,
        credit: convertedAmount,
        balance: 0,
        currency: currency
      });
    }
    
    // Add payments as debit transactions (we paid supplier)
    for (const payment of payments) {
      // Payments table doesn't have currency field, assume target currency
      transactions.push({
        date: payment.paymentDate,
        type: 'Payment',
        reference: payment.paymentNumber,
        description: `Payment made via ${payment.paymentMethod}`,
        serviceDetails: '',
        debit: Number(payment.amount) || 0,
        credit: 0,
        balance: 0,
        currency: currency
      });
    }
    
    // Sort all transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate running balance (credit - debit = what we owe)
    let balance = 0;
    transactions.forEach(t => {
      balance += (t.credit - t.debit);
      t.balance = balance;
    });
    
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = totalCredit - totalDebit;
    
    return c.json({ 
      success: true, 
      data: {
        supplier: {
          name: supplier.companyName,
          email: supplier.email,
          phone: supplier.phone,
          contactPerson: supplier.contactPerson
        },
        summary: {
          openingBalance: 0,
          totalDebit,
          totalCredit,
          closingBalance
        },
        transactions
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Employee Commissions Monthly Report - All Employees
reports.get('/employee-commissions-monthly', async (c) => {
  try {
    const { year, month, currency = 'AED' } = c.req.query();
    
    if (!year || !month) {
      return c.json({ success: false, error: 'Year and month are required' }, 400);
    }
    
    // Helper function to convert amount to target currency  
    const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
      if (fromCurrency === toCurrency) return amount;
      
      const [fromCurrencyData, toCurrencyData] = await Promise.all([
        prisma.currencies.findUnique({
          where: { code: fromCurrency },
          select: { exchangeRateToAED: true }
        }),
        prisma.currencies.findUnique({
          where: { code: toCurrency },
          select: { exchangeRateToAED: true }
        })
      ]);
      
      if (!fromCurrencyData || !toCurrencyData) return amount;
      
      const amountInAED = amount * Number(fromCurrencyData.exchangeRateToAED);
      return amountInAED / Number(toCurrencyData.exchangeRateToAED);
    };
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'COMPLETE'] }
      },
      include: {
        employees_bookings_bookingAgentIdToemployees: {
          select: {
            id: true,
            users: { select: { firstName: true, lastName: true } }
          }
        },
        employees_bookings_customerServiceIdToemployees: {
          select: {
            id: true,
            users: { select: { firstName: true, lastName: true } }
          }
        },
        customers: {
          select: { firstName: true, lastName: true, companyName: true }
        }
      }
    });
    
    const employeeMap = new Map<string, any>();
    
    for (const booking of bookings) {
      // Process agent commission
      if (booking.employees_bookings_bookingAgentIdToemployees && booking.agentCommissionAmount) {
        const agent = booking.employees_bookings_bookingAgentIdToemployees;
        const id = agent.id;
        const name = `${agent.users.firstName} ${agent.users.lastName}`;
        
        const commission = await convertCurrency(
          Number(booking.agentCommissionAmount),
          booking.saleCurrency,
          currency as string
        );
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, {
            employeeName: name,
            totalBookings: 0,
            totalCommission: 0,
            averageCommission: 0,
            currency: currency,
            breakdown: []
          });
        }
        
        const emp = employeeMap.get(id)!;
        emp.totalBookings++;
        emp.totalCommission += commission;
        emp.breakdown.push({
          date: (booking.bookingDate || booking.createdAt).toISOString().split('T')[0],
          bookingNumber: booking.bookingNumber,
          customer: booking.customers?.companyName || 
                   `${booking.customers?.firstName || ''} ${booking.customers?.lastName || ''}`.trim(),
          commission: commission
        });
      }
      
      // Process CS commission
      if (booking.employees_bookings_customerServiceIdToemployees && booking.salesCommissionAmount) {
        const cs = booking.employees_bookings_customerServiceIdToemployees;
        const id = cs.id;
        const name = `${cs.users.firstName} ${cs.users.lastName}`;
        
        const commission = await convertCurrency(
          Number(booking.salesCommissionAmount),
          booking.saleCurrency,
          currency as string
        );
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, {
            employeeName: name,
            totalBookings: 0,
            totalCommission: 0,
            averageCommission: 0,
            currency: currency,
            breakdown: []
          });
        }
        
        const emp = employeeMap.get(id)!;
        emp.totalBookings++;
        emp.totalCommission += commission;
        emp.breakdown.push({
          date: (booking.bookingDate || booking.createdAt).toISOString().split('T')[0],
          bookingNumber: booking.bookingNumber,
          customer: booking.customers?.companyName || 
                   `${booking.customers?.firstName || ''} ${booking.customers?.lastName || ''}`.trim(),
          commission: commission
        });
      }
    }
    
    const employees = Array.from(employeeMap.values()).map(emp => ({
      ...emp,
      averageCommission: emp.totalBookings > 0 ? emp.totalCommission / emp.totalBookings : 0
    }));
    
    const summary = {
      totalEmployees: employees.length,
      totalBookings: employees.reduce((sum, e) => sum + e.totalBookings, 0),
      totalCommissions: employees.reduce((sum, e) => sum + e.totalCommission, 0),
      averagePerEmployee: employees.length > 0 
        ? employees.reduce((sum, e) => sum + e.totalCommission, 0) / employees.length 
        : 0
    };
    
    return c.json({
      success: true,
      data: { employees, summary }
    });
  } catch (error: any) {
    console.error('Error generating employee commissions report:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Employee Commissions Monthly Report - Single Employee
reports.get('/employee-commissions-monthly/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const { year, month, currency = 'AED' } = c.req.query();
    
    // Helper function to convert amount to target currency
    const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
      if (fromCurrency === toCurrency) return amount;
      
      const [fromCurrencyData, toCurrencyData] = await Promise.all([
        prisma.currencies.findUnique({
          where: { code: fromCurrency },
          select: { exchangeRateToAED: true }
        }),
        prisma.currencies.findUnique({
          where: { code: toCurrency },
          select: { exchangeRateToAED: true }
        })
      ]);
      
      if (!fromCurrencyData || !toCurrencyData) {
        return amount;
      }
      
      const amountInAED = amount * Number(fromCurrencyData.exchangeRateToAED);
      const convertedAmount = amountInAED / Number(toCurrencyData.exchangeRateToAED);
      
      return convertedAmount;
    };
    
    // Get date range for the month
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    
    const [employee, bookings] = await Promise.all([
      prisma.employees.findUnique({
        where: { id: employeeId },
        select: {
          employeeCode: true,
          users: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.bookings.findMany({
        where: {
          OR: [
            { bookingAgentId: employeeId },
            { customerServiceId: employeeId }
          ],
          bookingDate: { gte: startDate, lte: endDate }
        },
        select: {
          id: true,
          bookingNumber: true,
          createdAt: true,
          serviceType: true,
          serviceDetails: true,
          saleAmount: true,
          saleCurrency: true,
          agentCommissionAmount: true,
          salesCommissionAmount: true,
          customers: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);
    
    if (!employee) {
      return c.json({ success: false, error: 'Employee not found' }, 404);
    }
    
    const transactions: any[] = [];
    let totalCommission = 0;
    
    for (const booking of bookings) {
      const commission = (Number(booking.agentCommissionAmount) || 0) + (Number(booking.salesCommissionAmount) || 0);
      const convertedCommission = await convertCurrency(commission, booking.saleCurrency || 'AED', currency);
      
      totalCommission += convertedCommission;
      
      // Parse serviceDetails
      let serviceDetailsStr = '';
      try {
        const details = JSON.parse(booking.serviceDetails || '{}');
        if (booking.serviceType === 'HOTEL' && details.hotelName) {
          serviceDetailsStr = details.hotelName;
        } else if (booking.serviceType === 'FLIGHT' && details.airline) {
          serviceDetailsStr = details.airline;
        } else if (details.name) {
          serviceDetailsStr = details.name;
        }
      } catch (e) {
        // ignore
      }
      
      const customerName = booking.customers.companyName || `${booking.customers.firstName} ${booking.customers.lastName}`;
      
      transactions.push({
        date: (booking.bookingDate || booking.createdAt).toISOString().split('T')[0],
        bookingNumber: booking.bookingNumber,
        customer: customerName,
        commission: convertedCommission
      });
    }
    
    // Return same structure as all-employees endpoint
    const employeeName = `${employee.users.firstName} ${employee.users.lastName}`;
    const employees = [{
      employeeName: employeeName,
      totalBookings: transactions.length,
      totalCommission: totalCommission,
      averageCommission: transactions.length > 0 ? totalCommission / transactions.length : 0,
      currency: currency,
      breakdown: transactions
    }];
    
    const summary = {
      totalEmployees: 1,
      totalBookings: transactions.length,
      totalCommissions: totalCommission,
      averagePerEmployee: totalCommission
    };
    
    return c.json({
      success: true,
      data: {
        employees,
        summary
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Old reports route (legacy)
reports.get('/old/*', async (c) => {
  return c.json({ success: true, message: 'Use new report endpoints: /financial, /bookings, /invoices, /employee-commission, /profit-loss, /cash-flow, /customer-statement, /supplier-statement, /employee-commissions-monthly' });
});

export default reports;
