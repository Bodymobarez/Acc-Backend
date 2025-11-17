import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';

const router = Router();

// Exchange rates (1 AED = X currency)
const exchangeRates: Record<string, number> = {
  // Base
  AED: 1.00,
  // Major Currencies
  USD: 3.67, EUR: 4.10, GBP: 4.75, CHF: 4.15, CAD: 2.65, AUD: 2.38, NZD: 2.18,
  // GCC Currencies
  SAR: 0.98, KWD: 12.05, QAR: 1.01, BHD: 9.73, OMR: 9.54,
  // Middle East & North Africa
  EGP: 0.075, JOD: 5.17, LBP: 0.00004, TRY: 0.11, IQD: 0.0028, SYP: 0.00014,
  YER: 0.015, ILS: 1.02, MAD: 0.37, TND: 1.18, DZD: 0.027, LYD: 0.76,
  SDG: 0.0061, IRR: 0.000087, AFN: 0.053,
  // Asian Currencies
  INR: 0.044, PKR: 0.013, BDT: 0.031, PHP: 0.063, IDR: 0.00023, MYR: 0.82,
  SGD: 2.73, THB: 0.106, VND: 0.00015, CNY: 0.51, JPY: 0.024, KRW: 0.0028,
  AZN: 2.16, GEL: 1.33,
  // European Currencies
  SEK: 0.35, NOK: 0.34, DKK: 0.55, PLN: 0.92, CZK: 0.16, HUF: 0.010, RUB: 0.038,
  // African Currencies
  ZAR: 0.20, NGN: 0.0024, KES: 0.028, GHS: 0.24, TZS: 0.0014, UGX: 0.00098,
  ETB: 0.029,
  // Latin American Currencies
    BRL: 0.63, MXN: 0.18, ARS: 0.0037, CLP: 0.0038, COP: 0.00084, PEN: 0.97
};

// Helper function to convert amounts to AED
// exchangeRates represent: 1 CURRENCY = X AED (e.g., 1 USD = 3.67 AED)
const convertToAED = (amount: number, currency: string): number => {
  return amount * (exchangeRates[currency] || 1);
};

// Helper function to convert from AED to any currency
// If 1 USD = 3.67 AED, then 1 AED = 1/3.67 USD = 0.272 USD
const convertFromAED = (amountInAED: number, targetCurrency: string): number => {
  if (targetCurrency === 'AED') return amountInAED;
  const rate = exchangeRates[targetCurrency] || 1;
  // If rate is "1 XYZ = X AED", then "1 AED = 1/X XYZ"
  return amountInAED / rate;
};

// Helper function to convert between any two currencies
const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  // Convert to AED first, then to target currency
  const amountInAED = convertToAED(amount, fromCurrency);
  return convertFromAED(amountInAED, toCurrency);
};

// OLD Financial Report - DEPRECATED - Use /financial-summary instead
// This route is kept for backwards compatibility but will be removed
router.get('/financial-old-deprecated', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Get bookings
    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'REFUNDED'] }
      },
      include: {
        customers: { select: { firstName: true, lastName: true, companyName: true } },
        suppliers: { select: { companyName: true } }
      }
    });

    // Calculate summary
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalCommissions = 0;

    bookings.forEach(booking => {
      const revenue = convertToAED(booking.saleAmount, booking.saleCurrency);
      const cost = convertToAED(booking.costAmount, booking.costCurrency);
      
      totalRevenue += revenue;
      totalCost += cost;
      totalProfit += (booking.netProfit || 0);
      totalCommissions += (booking.totalCommission || 0);
    });

    res.json({
      success: true,
      data: {
        summary: {
          'Total Revenue': totalRevenue,
          'Total Cost': totalCost,
          'Gross Profit': totalProfit,
          'Total Commissions': totalCommissions,
        },
        details: bookings.map(b => ({
          Date: new Date(b.bookingDate).toLocaleDateString(),
          'Booking #': b.bookingNumber,
          Customer: b.customers?.companyName || `${b.customers?.firstName || ''} ${b.customers?.lastName || ''}`.trim() || 'N/A',
          Supplier: b.suppliers?.companyName,
          Revenue: convertToAED(b.saleAmount, b.saleCurrency),
          Cost: convertToAED(b.costAmount, b.costCurrency),
          Profit: b.netProfit || 0,
        }))
      }
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Bookings Report
router.get('/bookings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate }
      },
      include: {
        customers: { select: { firstName: true, lastName: true, companyName: true } },
        suppliers: { select: { companyName: true } },
        bookingAgent: { select: { users: { select: { firstName: true, lastName: true } } } },
        customerService: { select: { users: { select: { firstName: true, lastName: true } } } }
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          'Total Bookings': bookings.length,
          'Confirmed': bookings.filter(b => b.status === 'CONFIRMED').length,
          'Refunded': bookings.filter(b => b.status === 'REFUNDED' || b.status === 'REFUNDED').length,
        },
        details: bookings.map(b => ({
          Date: new Date(b.bookingDate).toLocaleDateString(),
          'Booking #': b.bookingNumber,
          Customer: b.customers?.companyName || `${b.customers?.firstName || ''} ${b.customers?.lastName || ''}`.trim() || 'N/A',
          Service: b.serviceType,
          Status: b.status,
          'Sale Amount': convertToAED(b.saleAmount, b.saleCurrency),
          Agent: b.bookingAgent ? `${b.bookingAgent.users.firstName} ${b.bookingAgent.users.lastName}` : 'N/A',
        }))
      }
    });
  } catch (error) {
    console.error('Error generating bookings report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Employee Commissions Report
router.get('/employees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'REFUNDED'] }
      },
      include: {
        bookingAgent: {
          select: {
            id: true,
            users: { select: { firstName: true, lastName: true } }
          }
        },
        customerService: {
          select: {
            id: true,
            users: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    // Group by employee
    const employeeMap = new Map();

    bookings.forEach(booking => {
      if (booking.bookingAgent && booking.agentCommissionAmount) {
        const id = booking.bookingAgent.id;
        const name = `${booking.bookingAgent.users.firstName} ${booking.bookingAgent.users.lastName}`;
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, { name, commission: 0, bookings: 0, type: 'Agent' });
        }
        const emp = employeeMap.get(id);
        emp.commission += booking.agentCommissionAmount;
        emp.bookings += 1;
      }

      if (booking.customerService && booking.csCommissionAmount) {
        const id = booking.customerService.id;
        const name = `${booking.customerService.users.firstName} ${booking.customerService.users.lastName}`;
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, { name, commission: 0, bookings: 0, type: 'CS' });
        }
        const emp = employeeMap.get(id);
        emp.commission += booking.csCommissionAmount;
        emp.bookings += 1;
      }
    });

    const employees = Array.from(employeeMap.values());
    const totalCommissions = employees.reduce((sum, e) => sum + e.commission, 0);

    res.json({
      success: true,
      data: {
        summary: {
          'Total Employees': employees.length,
          'Total Commissions': totalCommissions,
          'Total Bookings': bookings.length,
        },
        details: employees.map(e => ({
          Employee: e.name,
          Type: e.type,
          'Total Bookings': e.bookings,
          'Total Commission': e.commission,
          'Avg per Booking': e.bookings > 0 ? e.commission / e.bookings : 0,
        }))
      }
    });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Customers Report
router.get('/customers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate }
      },
      include: {
        customers: { select: { firstName: true, lastName: true, companyName: true, email: true, phone: true } }
      }
    });

    // Group by customer
    const customerMap = new Map();

    bookings.forEach(booking => {
      const customerId = booking.customerId;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          name: booking.customers?.companyName || `${booking.customers?.firstName || ''} ${booking.customers?.lastName || ''}`.trim() || 'N/A',
          email: booking.customers?.email,
          phone: booking.customers?.phone,
          bookings: 0,
          revenue: 0,
        });
      }
      const cust = customerMap.get(customerId);
      cust.bookings += 1;
      cust.revenue += convertToAED(booking.saleAmount, booking.saleCurrency);
    });

    const customers = Array.from(customerMap.values());
    const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);

    res.json({
      success: true,
      data: {
        summary: {
          'Total Customers': customers.length,
          'Total Revenue': totalRevenue,
          'Total Bookings': bookings.length,
        },
        details: customers.map(c => ({
          Customer: c.name,
          Email: c.email,
          Phone: c.phone,
          'Total Bookings': c.bookings,
          'Total Revenue': c.revenue,
          'Avg per Booking': c.bookings > 0 ? c.revenue / c.bookings : 0,
        }))
      }
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Suppliers Report
router.get('/suppliers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        supplierId: { not: null }
      },
      include: {
        suppliers: { select: { companyName: true, contactPerson: true, email: true } }
      }
    });

    // Group by supplier
    const supplierMap = new Map();

    bookings.forEach(booking => {
      if (!booking.supplierId) return;
      
      const supplierId = booking.supplierId;
      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          name: booking.suppliers?.companyName,
          contact: booking.suppliers?.contactPerson,
          email: booking.suppliers?.email,
          bookings: 0,
          cost: 0,
        });
      }
      const supp = supplierMap.get(supplierId);
      supp.bookings += 1;
      supp.cost += convertToAED(booking.costAmount, booking.costCurrency);
    });

    const suppliers = Array.from(supplierMap.values());
    const totalCost = suppliers.reduce((sum, s) => sum + s.cost, 0);

    res.json({
      success: true,
      data: {
        summary: {
          'Total Suppliers': suppliers.length,
          'Total Cost': totalCost,
          'Total Bookings': bookings.length,
        },
        details: suppliers.map(s => ({
          Supplier: s.name,
          Contact: s.contact,
          Email: s.email,
          'Total Bookings': s.bookings,
          'Total Cost': s.cost,
          'Avg per Booking': s.bookings > 0 ? s.cost / s.bookings : 0,
        }))
      }
    });
  } catch (error) {
    console.error('Error generating supplier report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// VAT Report
router.get('/vat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        vatApplicable: true
      }
    });

    let totalVAT = 0;
    let totalNetBeforeVAT = 0;
    let totalWithVAT = 0;

    const details = bookings.map(booking => {
      const vat = booking.vatAmount || 0;
      const net = booking.netBeforeVAT || 0;
      const total = booking.totalWithVAT || 0;

      totalVAT += vat;
      totalNetBeforeVAT += net;
      totalWithVAT += total;

      return {
        Date: new Date(booking.bookingDate).toLocaleDateString(),
        'Booking #': booking.bookingNumber,
        'Net Before VAT': net,
        'VAT Amount': vat,
        'Total with VAT': total,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          'Total Net Before VAT': totalNetBeforeVAT,
          'Total VAT': totalVAT,
          'Total with VAT': totalWithVAT,
          'VAT Rate': '5%',
        },
        details
      }
    });
  } catch (error) {
    console.error('Error generating VAT report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Cash Flow Report
// OLD Cash Flow Route - REMOVED - Use the new implementation below

// Customer Statement Report
router.get('/customer-statement/:customerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const { dateFrom, dateTo, currency } = req.query;
    const targetCurrency = (currency as string) || 'AED';

    const bookings = await prisma.bookings.findMany({
      where: {
        customerId,
        bookingDate: { gte: new Date(dateFrom as string), lte: new Date(dateTo as string) }
      },
      orderBy: { bookingDate: 'asc' }
    });

    const receipts = await prisma.receipts.findMany({
      where: {
        customerId,
        receiptDate: { gte: new Date(dateFrom as string), lte: new Date(dateTo as string) }
      },
      orderBy: { receiptDate: 'asc' }
    });

    let balance = 0;
    const transactions: any[] = [];

    // Add bookings as debits (convert to target currency)
    bookings.forEach(b => {
      const amount = convertCurrency(b.saleAmount, b.saleCurrency, targetCurrency);
      balance += amount;
      transactions.push({
        date: b.bookingDate,
        type: 'Invoice',
        reference: b.bookingNumber,
        description: `Booking ${b.bookingNumber}`,
        debit: amount,
        credit: 0,
        balance,
        currency: targetCurrency
      });
    });

    // Add receipts as credits (assuming receipts are in AED, convert to target)
    receipts.forEach(r => {
      const amount = convertCurrency(r.amount, 'AED', targetCurrency);
      balance -= amount;
      transactions.push({
        date: r.receiptDate,
        type: 'Receipt',
        reference: r.receiptNumber,
        description: `Receipt ${r.receiptNumber}`,
        debit: 0,
        credit: amount,
        balance,
        currency: targetCurrency
      });
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        summary: {
          openingBalance: 0,
          totalDebit: bookings.reduce((sum, b) => sum + convertCurrency(b.saleAmount, b.saleCurrency, targetCurrency), 0),
          totalCredit: receipts.reduce((sum, r) => sum + convertCurrency(r.amount, 'AED', targetCurrency), 0),
          closingBalance: balance
        }
      }
    });
  } catch (error) {
    console.error('Error generating customer statement:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Trial Balance Report
router.get('/trial-balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, currency } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Get all journal entries in date range
    const journalEntries = await prisma.journal_entries.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      select: {
        debitAccountId: true,
        creditAccountId: true,
        amount: true
      }
    });

    // Get all accounts
    const accounts = await prisma.accounts.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true
      }
    });

    // Calculate balances
    const balanceMap = new Map<string, { debit: number; credit: number }>();
    
    journalEntries.forEach(entry => {
      // Debit account
      if (entry.debitAccountId) {
        const current = balanceMap.get(entry.debitAccountId) || { debit: 0, credit: 0 };
        current.debit += entry.amount;
        balanceMap.set(entry.debitAccountId, current);
      }
      
      // Credit account
      if (entry.creditAccountId) {
        const current = balanceMap.get(entry.creditAccountId) || { debit: 0, credit: 0 };
        current.credit += entry.amount;
        balanceMap.set(entry.creditAccountId, current);
      }
    });

    // Build response
    const data = accounts
      .map(account => {
        const balance = balanceMap.get(account.id) || { debit: 0, credit: 0 };
        return {
          accountCode: account.code,
          accountName: account.name,
          accountNameAr: account.nameAr,
          debit: balance.debit,
          credit: balance.credit
        };
      })
      .filter(a => a.debit !== 0 || a.credit !== 0);

    const totalDebit = data.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = data.reduce((sum, a) => sum + a.credit, 0);

    res.json({
      success: true,
      data: {
        accounts: data,
        totals: {
          totalDebit,
          totalCredit,
          difference: totalDebit - totalCredit
        }
      }
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Employee Commissions Monthly Report
router.get('/employee-commissions-monthly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month, currency } = req.query;
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'REFUNDED'] }
      },
      select: {
        id: true,
        bookingNumber: true,
        bookingDate: true,
        serviceType: true,
        serviceDetails: true,
        status: true,
        saleCurrency: true,
        agentCommissionAmount: true,
        csCommissionAmount: true,
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
        customers: { select: { firstName: true, lastName: true, companyName: true } }
      }
    });

    const employeeMap = new Map();

    const targetCurrency = (currency as string) || 'AED';

    bookings.forEach(booking => {
      const bookingAgent = booking.employees_bookings_bookingAgentIdToemployees;
      if (bookingAgent && booking.agentCommissionAmount) {
        const id = bookingAgent.id;
        const name = `${bookingAgent.users.firstName} ${bookingAgent.users.lastName}`;
        
        // Convert commission from booking's sale currency to target currency
        const commissionInTargetCurrency = convertCurrency(
          booking.agentCommissionAmount,
          booking.saleCurrency,
          targetCurrency
        );
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, { 
            employeeName: name, 
            totalBookings: 0, 
            totalCommission: 0,
            breakdown: []
          });
        }
        const emp = employeeMap.get(id);
        emp.totalBookings += 1;
        emp.totalCommission += commissionInTargetCurrency;
        
        // Parse service details with proper formatting
        let serviceDetailsText = '';
        try {
          const details = JSON.parse(booking.serviceDetails || '{}');
          const hasDetails = Object.keys(details).length > 0;
          
          if (hasDetails) {
            if (booking.serviceType === 'HOTEL') {
              serviceDetailsText = details.hotelName || details.name || '';
            } else if (booking.serviceType === 'FLIGHT') {
              // For flights, show route (from → to)
              const from = details.departureCity || details.from || '';
              const to = details.arrivalCity || details.to || '';
              if (from && to) {
                serviceDetailsText = `${from} → ${to}`;
              } else {
                serviceDetailsText = details.airline || details.flightNumber || '';
              }
            } else if (booking.serviceType === 'VISA') {
              serviceDetailsText = details.country || details.destination || '';
            } else if (booking.serviceType === 'TRANSFER') {
              serviceDetailsText = details.from && details.to ? `${details.from} → ${details.to}` : (details.route || '');
            } else if (booking.serviceType === 'CRUISE') {
              serviceDetailsText = details.cruiseName || details.shipName || '';
            } else {
              serviceDetailsText = details.description || details.name || '';
            }
          }
        } catch (e) {
          serviceDetailsText = '';
        }
        
        // Fallback if empty
        if (!serviceDetailsText || serviceDetailsText.trim() === '') {
          serviceDetailsText = 'Not specified';
        }
        
        emp.breakdown.push({
          date: new Date(booking.bookingDate).toLocaleDateString(),
          bookingNumber: booking.bookingNumber,
          customer: booking.customers?.companyName || `${booking.customers?.firstName || ''} ${booking.customers?.lastName || ''}`.trim() || 'N/A',
          service: booking.serviceType,
          serviceDetails: serviceDetailsText,
          status: booking.status,
          commission: commissionInTargetCurrency
        });
      }

      const customerService = booking.employees_bookings_customerServiceIdToemployees;
      if (customerService && booking.csCommissionAmount) {
        const id = customerService.id;
        const name = `${customerService.users.firstName} ${customerService.users.lastName}`;
        
        // Convert commission from booking's sale currency to target currency
        const commissionInTargetCurrency = convertCurrency(
          booking.csCommissionAmount,
          booking.saleCurrency,
          targetCurrency
        );
        
        if (!employeeMap.has(id)) {
          employeeMap.set(id, { 
            employeeName: name, 
            totalBookings: 0, 
            totalCommission: 0,
            breakdown: []
          });
        }
        const emp = employeeMap.get(id);
        emp.totalBookings += 1;
        emp.totalCommission += commissionInTargetCurrency;
        
        // Parse service details with proper formatting
        let serviceDetailsText = '';
        try {
          const details = JSON.parse(booking.serviceDetails || '{}');
          const hasDetails = Object.keys(details).length > 0;
          
          if (hasDetails) {
            if (booking.serviceType === 'HOTEL') {
              serviceDetailsText = details.hotelName || details.name || '';
            } else if (booking.serviceType === 'FLIGHT') {
              // For flights, show route (from → to)
              const from = details.departureCity || details.from || '';
              const to = details.arrivalCity || details.to || '';
              if (from && to) {
                serviceDetailsText = `${from} → ${to}`;
              } else {
                serviceDetailsText = details.airline || details.flightNumber || '';
              }
            } else if (booking.serviceType === 'VISA') {
              serviceDetailsText = details.country || details.destination || '';
            } else if (booking.serviceType === 'TRANSFER') {
              serviceDetailsText = details.from && details.to ? `${details.from} → ${details.to}` : (details.route || '');
            } else if (booking.serviceType === 'CRUISE') {
              serviceDetailsText = details.cruiseName || details.shipName || '';
            } else {
              serviceDetailsText = details.description || details.name || '';
            }
          }
        } catch (e) {
          serviceDetailsText = '';
        }
        
        // Fallback if empty
        if (!serviceDetailsText || serviceDetailsText.trim() === '') {
          serviceDetailsText = 'Not specified';
        }
        
        emp.breakdown.push({
          date: new Date(booking.bookingDate).toLocaleDateString(),
          bookingNumber: booking.bookingNumber,
          customer: booking.customers?.companyName || `${booking.customers?.firstName || ''} ${booking.customers?.lastName || ''}`.trim() || 'N/A',
          service: booking.serviceType,
          serviceDetails: serviceDetailsText,
          status: booking.status,
          commission: commissionInTargetCurrency
        });
      }
    });

    const employees = Array.from(employeeMap.values()).map(emp => ({
      ...emp,
      averageCommission: emp.totalCommission / emp.totalBookings,
      currency: currency || 'AED'
    }));

    res.json({
      success: true,
      data: {
        employees,
        summary: {
          totalEmployees: employees.length,
          totalBookings: bookings.length,
          totalCommissions: employees.reduce((sum, e) => sum + e.totalCommission, 0),
          averagePerEmployee: employees.length > 0 
            ? employees.reduce((sum, e) => sum + e.totalCommission, 0) / employees.length 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error generating employee commissions report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Employee Commissions Monthly Report (Individual)
router.get('/employee-commissions-monthly/:employeeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { year, month, currency } = req.query;
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const bookings = await prisma.bookings.findMany({
      where: {
        OR: [
          { bookingAgentId: employeeId },
          { customerServiceId: employeeId }
        ],
        bookingDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'REFUNDED'] }
      },
      include: {
        customers: { select: { firstName: true, lastName: true, companyName: true } }
      }
    });

    const targetCurrency = (currency as string) || 'AED';

    const transactions = bookings.map(b => {
      const agentCommission = b.agentCommissionAmount || 0;
      const csCommission = b.csCommissionAmount || 0;
      const totalCommissionInBookingCurrency = agentCommission + csCommission;
      
      // Convert to target currency
      const commissionInTargetCurrency = convertCurrency(
        totalCommissionInBookingCurrency,
        b.saleCurrency,
        targetCurrency
      );

      return {
        date: b.bookingDate.toISOString(),
        bookingNumber: b.bookingNumber,
        bookingId: b.id,
        customer: b.customers?.companyName || `${b.customers?.firstName || ''} ${b.customers?.lastName || ''}`.trim() || 'N/A',
        serviceType: b.serviceType || 'N/A',
        serviceDetails: b.serviceDetails || '',
        commission: commissionInTargetCurrency,
        currency: targetCurrency
      };
    });

    const totalCommission = transactions.reduce((sum, t) => sum + t.commission, 0);

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalCommission,
          bookingsCount: bookings.length
        }
      }
    });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// VAT Return Report (UAE)
router.get('/vat-return', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const bookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        vatApplicable: true
      }
    });

    const standardRatedSupplies = bookings.reduce((sum, b) => sum + (b.netBeforeVAT || 0), 0);
    const taxOnStandardRatedSupplies = bookings.reduce((sum, b) => sum + (b.vatAmount || 0), 0);

    // Get purchases (payments)
    const payments = await prisma.payments.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate }
      }
    });

    const standardRatedPurchases = payments.reduce((sum, p) => sum + p.amount, 0);
    const inputVATOnPurchases = standardRatedPurchases * 0.05; // Assume 5% VAT

    const totalVATDue = taxOnStandardRatedSupplies;
    const recoverableVAT = inputVATOnPurchases;
    const netVATDue = totalVATDue - recoverableVAT;

    res.json({
      success: true,
      data: {
        standardRatedSupplies,
        taxOnStandardRatedSupplies,
        zeroRatedSupplies: 0,
        exemptSupplies: 0,
        goodsImported: 0,
        adjustments: 0,
        totalVATDue,
        standardRatedPurchases,
        inputVATOnPurchases,
        recoverableVAT,
        netVATDue
      }
    });
  } catch (error) {
    console.error('Error generating VAT return:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// Export endpoints (placeholder for Excel export)
router.get('/:reportType/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Export functionality will be implemented with Excel library'
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, error: 'Failed to export report' });
  }
});

// Supplier Statement Report
router.get('/supplier-statement/:supplierId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { dateFrom, dateTo, currency = 'AED' } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Get supplier info
    const supplier = await prisma.suppliers.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    // Get all transactions (bookings + payments)
    const bookings = await prisma.bookings.findMany({
      where: {
        supplierId,
        bookingDate: { gte: startDate, lte: endDate }
      },
      orderBy: { bookingDate: 'asc' }
    });

    const payments = await prisma.payments.findMany({
      where: {
        supplierId,
        paymentDate: { gte: startDate, lte: endDate }
      },
      orderBy: { paymentDate: 'asc' }
    });

    // Calculate opening balance (all transactions before dateFrom)
    const previousBookings = await prisma.bookings.findMany({
      where: { supplierId, bookingDate: { lt: startDate } }
    });
    const previousPayments = await prisma.payments.findMany({
      where: { supplierId, paymentDate: { lt: startDate } }
    });

    const targetCurrency = (currency as string) || 'AED';

    let openingBalance = 0;
    previousBookings.forEach(b => {
      const amountInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      openingBalance += convertFromAED(amountInAED, targetCurrency);
    });
    previousPayments.forEach(p => {
      const amountInAED = p.amount; // Already in AED
      openingBalance -= convertFromAED(amountInAED, targetCurrency);
    });

    // Build transactions array
    const transactions: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;
    let runningBalance = openingBalance;

    // Add bookings (Credits - we owe supplier) - convert to target currency
    bookings.forEach(b => {
      const amountInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      const amount = convertFromAED(amountInAED, targetCurrency);
      runningBalance += amount;
      totalCredit += amount;
      transactions.push({
        date: b.bookingDate.toISOString(),
        type: 'Booking',
        reference: b.bookingNumber,
        description: `Booking ${b.bookingNumber}`,
        serviceDetails: b.serviceType || '',
        bookingId: b.id,
        debit: 0,
        credit: amount,
        balance: runningBalance,
        currency: targetCurrency
      });
    });

    // Add payments (Debits - we paid supplier) - amounts already in AED
    payments.forEach(p => {
      const amountInAED = p.amount; // Already in AED
      const amount = convertFromAED(amountInAED, targetCurrency);
      runningBalance -= amount;
      totalDebit += amount;
      transactions.push({
        date: p.paymentDate.toISOString(),
        type: 'Payment',
        reference: p.paymentNumber,
        description: p.notes || 'Payment',
        debit: amount,
        credit: 0,
        balance: runningBalance,
        currency: targetCurrency
      });
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      success: true,
      data: {
        supplier: {
          name: supplier.companyName,
          id: supplier.id
        },
        summary: {
          openingBalance,
          totalDebit,
          totalCredit,
          closingBalance: runningBalance
        },
        transactions
      }
    });
  } catch (error) {
    console.error('Error generating supplier statement:', error);
    res.status(500).json({ success: false, error: 'Failed to generate supplier statement' });
  }
});

// Financial Summary Report
router.get('/financial-summary', authenticate, async (req: AuthRequest, res: Response) => {
  console.log('🎯 Financial Summary API called');
  try {
    const { dateFrom, dateTo, currency = 'AED' } = req.query;
    console.log('📅 Date range:', dateFrom, 'to', dateTo);
    
    // Normalize date range to full days to avoid timezone truncation
    const startDate = new Date(String(dateFrom));
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(String(dateTo));
    endDate.setHours(23, 59, 59, 999);

    // Get CONFIRMED bookings
    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      },
      orderBy: { bookingDate: 'asc' }
    });

    // Get REFUNDED bookings only
    console.log('🔍 Querying REFUNDED bookings with dates:', startDate, 'to', endDate);
    const refundedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'REFUNDED'
      },
      orderBy: { bookingDate: 'asc' }
    });
    console.log('📊 Found', refundedBookings.length, 'refunded bookings');

    // Calculate Revenue from CONFIRMED bookings
    let totalRevenue = 0;
    let totalCost = 0;
    let totalCommissions = 0;

    confirmedBookings.forEach(b => {
      // Use saleInAED if available, otherwise convert
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      totalRevenue += Math.abs(saleInAED);
      totalCost += Math.abs(costInAED);
      totalCommissions += Math.abs(b.totalCommission || 0);
    });

    // Calculate Refunds from REFUNDED bookings
    let totalRefunds = 0;
    let refundCost = 0;

    refundedBookings.forEach(b => {
      // Use saleInAED if available, otherwise convert
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      console.log(`  → ${b.bookingNumber}: saleInAED=${saleInAED}, Math.abs=${Math.abs(saleInAED)}`);
      totalRefunds += Math.abs(saleInAED);
      refundCost += Math.abs(costInAED);
    });
    console.log('💰 Final totalRefunds:', totalRefunds, '| refundCost:', refundCost);

    // Calculate Net values
    const netRevenue = totalRevenue - totalRefunds;
    const netCost = totalCost - refundCost;
    const grossProfit = netRevenue - netCost;
    const netProfit = grossProfit - totalCommissions;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : '0.00';

    // Monthly breakdown
    const monthlyData: Record<string, any> = {};
    
    // Add confirmed bookings to monthly data
    confirmedBookings.forEach(b => {
      const monthKey = b.bookingDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          revenue: 0,
          refunds: 0,
          cost: 0,
          refundCost: 0,
          commissions: 0,
          bookings: 0
        };
      }
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      monthlyData[monthKey].revenue += Math.abs(saleInAED);
      monthlyData[monthKey].cost += Math.abs(costInAED);
      monthlyData[monthKey].commissions += Math.abs(b.totalCommission || 0);
      monthlyData[monthKey].bookings += 1;
    });

    // Subtract refunds from monthly data
    refundedBookings.forEach(b => {
      const monthKey = b.bookingDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          revenue: 0,
          refunds: 0,
          cost: 0,
          refundCost: 0,
          commissions: 0,
          bookings: 0
        };
      }
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      monthlyData[monthKey].refunds += Math.abs(saleInAED);
      monthlyData[monthKey].refundCost += Math.abs(costInAED);
    });

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
      Month: month,
      Revenue: data.revenue,
      Refunds: data.refunds,
      'Net Revenue': data.revenue - data.refunds,
      Cost: data.cost,
      'Refund Cost': data.refundCost,
      'Net Cost': data.cost - data.refundCost,
      'Gross Profit': (data.revenue - data.refunds) - (data.cost - data.refundCost),
      Commissions: data.commissions,
      'Net Profit': ((data.revenue - data.refunds) - (data.cost - data.refundCost) - data.commissions),
      Bookings: data.bookings
    }));

    // Convert all amounts to target currency
    const targetCurrency = currency as string;
    const convertedMonthlyBreakdown = monthlyBreakdown.map(month => ({
      ...month,
      Revenue: convertFromAED(month.Revenue, targetCurrency),
      Refunds: convertFromAED(month.Refunds, targetCurrency),
      'Net Revenue': convertFromAED(month['Net Revenue'], targetCurrency),
      Cost: convertFromAED(month.Cost, targetCurrency),
      'Refund Cost': convertFromAED(month['Refund Cost'], targetCurrency),
      'Net Cost': convertFromAED(month['Net Cost'], targetCurrency),
      'Gross Profit': convertFromAED(month['Gross Profit'], targetCurrency),
      Commissions: convertFromAED(month.Commissions, targetCurrency),
      'Net Profit': convertFromAED(month['Net Profit'], targetCurrency)
    }));

    const responseData = {
      success: true,
      data: {
        totalRevenue: convertFromAED(totalRevenue, targetCurrency),
        totalRefunds: convertFromAED(totalRefunds, targetCurrency),
        netRevenue: convertFromAED(netRevenue, targetCurrency),
        totalCost: convertFromAED(totalCost, targetCurrency),
        refundCost: convertFromAED(refundCost, targetCurrency),
        netCost: convertFromAED(netCost, targetCurrency),
        grossProfit: convertFromAED(grossProfit, targetCurrency),
        totalCommissions: convertFromAED(totalCommissions, targetCurrency),
        netProfit: convertFromAED(netProfit, targetCurrency),
        profitMargin: parseFloat(profitMargin),
        monthlyBreakdown: convertedMonthlyBreakdown,
        confirmedBookingsCount: confirmedBookings.length,
        refundedBookingsCount: refundedBookings.length
      }
    };
    
    console.log('📤 Sending response:', JSON.stringify({
      totalRevenue,
      totalRefunds,
      refundCost,
      confirmedCount: confirmedBookings.length,
      refundedCount: refundedBookings.length
    }));
    
    res.json(responseData);
  } catch (error) {
    console.error('Error generating financial summary:', error);
    res.status(500).json({ success: false, error: 'Failed to generate financial summary' });
  }
});

// Profit & Loss Report
router.get('/profit-loss', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Get CONFIRMED bookings
    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      }
    });

    // Get REFUNDED bookings only
    const refundedBookings = await prisma.bookings.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        status: 'REFUNDED'
      }
    });

    // Calculate P&L components from CONFIRMED
    let totalRevenue = 0;
    let totalCost = 0;
    let totalCommissions = 0;

    confirmedBookings.forEach(b => {
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      totalRevenue += Math.abs(saleInAED);
      totalCost += Math.abs(costInAED);
      totalCommissions += Math.abs(b.totalCommission || 0);
    });

    // Calculate Refunds
    let totalRefunds = 0;
    let refundCost = 0;

    refundedBookings.forEach(b => {
      const saleInAED = b.saleInAED || convertToAED(b.saleAmount, b.saleCurrency);
      const costInAED = b.costInAED || convertToAED(b.costAmount, b.costCurrency);
      totalRefunds += Math.abs(saleInAED);
      refundCost += Math.abs(costInAED);
    });

    // Calculate Net values
    const netRevenue = totalRevenue - totalRefunds;
    const netCost = totalCost - refundCost;
    const grossProfit = netRevenue - netCost;
    const netProfit = grossProfit - totalCommissions;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : '0.00';

    // Convert all amounts to target currency
    const targetCurrency = currency as string;
    
    res.json({
      success: true,
      data: {
        totalRevenue: convertFromAED(totalRevenue, targetCurrency),
        totalRefunds: convertFromAED(totalRefunds, targetCurrency),
        netRevenue: convertFromAED(netRevenue, targetCurrency),
        totalCost: convertFromAED(totalCost, targetCurrency),
        refundCost: convertFromAED(refundCost, targetCurrency),
        netCost: convertFromAED(netCost, targetCurrency),
        grossProfit: convertFromAED(grossProfit, targetCurrency),
        totalCommissions: convertFromAED(totalCommissions, targetCurrency),
        netProfit: convertFromAED(netProfit, targetCurrency),
        profitMargin: parseFloat(profitMargin)
      }
    });
  } catch (error) {
    console.error('Error generating P&L report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate P&L report' });
  }
});

// Cash Flow Report
router.get('/cash-flow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, currency = 'AED' } = req.query;
    
    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Get all receipts (cash inflows)
    const receipts = await prisma.receipts.findMany({
      where: {
        receiptDate: { gte: startDate, lte: endDate }
      },
      include: {
        customers: { select: { firstName: true, lastName: true, companyName: true } }
      },
      orderBy: { receiptDate: 'asc' }
    });

    // Get all payments (cash outflows)
    const payments = await prisma.payments.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate }
      },
      include: {
        supplier: { select: { companyName: true } }
      },
      orderBy: { paymentDate: 'asc' }
    });

    let totalInflows = 0;
    let totalOutflows = 0;
    const details: any[] = [];

    // Add receipts (inflows) - amounts are already in AED
    receipts.forEach(r => {
      const amountInTargetCurrency = convertFromAED(r.amount, currency as string);
      totalInflows += amountInTargetCurrency;
      details.push({
        Date: r.receiptDate.toISOString(),
        Type: 'Inflow',
        Reference: r.receiptNumber,
        Method: r.paymentMethod,
        Amount: amountInTargetCurrency
      });
    });

    // Add payments (outflows) - amounts are already in AED
    payments.forEach(p => {
      const amountInTargetCurrency = convertFromAED(p.amount, currency as string);
      totalOutflows += amountInTargetCurrency;
      details.push({
        Date: p.paymentDate.toISOString(),
        Type: 'Outflow',
        Reference: p.paymentNumber,
        Method: p.paymentMethod,
        Amount: -amountInTargetCurrency
      });
    });

    // Sort by date
    details.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    const netCashFlow = totalInflows - totalOutflows;

    res.json({
      success: true,
      data: {
        totalInflows,
        totalOutflows,
        netCashFlow,
        details
      }
    });
  } catch (error) {
    console.error('Error generating cash flow report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate cash flow report' });
  }
});

export default router;
