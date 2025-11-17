import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
const router = Router();
// Exchange rates (1 AED = X currency)
const exchangeRates = {
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
const convertToAED = (amount, currency) => {
    return amount * (exchangeRates[currency] || 1);
};
// Helper function to convert from AED to any currency
// If 1 USD = 3.67 AED, then 1 AED = 1/3.67 USD = 0.272 USD
const convertFromAED = (amountInAED, targetCurrency) => {
    if (targetCurrency === 'AED')
        return amountInAED;
    const rate = exchangeRates[targetCurrency] || 1;
    // If rate is "1 XYZ = X AED", then "1 AED = 1/X XYZ"
    return amountInAED / rate;
};
// Helper function to convert between any two currencies
const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency)
        return amount;
    // Convert to AED first, then to target currency
    const amountInAED = convertToAED(amount, fromCurrency);
    return convertFromAED(amountInAED, toCurrency);
};
// Financial Summary Report
router.get('/financial', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        // Get bookings
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: { in: ['CONFIRMED', 'REFUND'] }
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
    }
    catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Bookings Report
router.get('/bookings', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
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
                    'Refunded': bookings.filter(b => b.status === 'REFUND').length,
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
    }
    catch (error) {
        console.error('Error generating bookings report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Employee Commissions Report
router.get('/employees', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: { in: ['CONFIRMED', 'REFUND'] }
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
    }
    catch (error) {
        console.error('Error generating employee report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Customers Report
router.get('/customers', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
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
    }
    catch (error) {
        console.error('Error generating customer report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Suppliers Report
router.get('/suppliers', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
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
            if (!booking.supplierId)
                return;
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
    }
    catch (error) {
        console.error('Error generating supplier report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// VAT Report
router.get('/vat', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
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
    }
    catch (error) {
        console.error('Error generating VAT report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Profit & Loss Report
router.get('/profit-loss', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: 'CONFIRMED'
            }
        });
        let totalRevenue = 0;
        let totalCost = 0;
        let totalCommissions = 0;
        let totalVAT = 0;
        bookings.forEach(booking => {
            totalRevenue += convertToAED(booking.saleAmount, booking.saleCurrency);
            totalCost += convertToAED(booking.costAmount, booking.costCurrency);
            totalCommissions += (booking.totalCommission || 0);
            totalVAT += (booking.vatAmount || 0);
        });
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalCommissions;
        res.json({
            success: true,
            data: {
                summary: {
                    'Total Revenue': totalRevenue,
                    'Total Cost': totalCost,
                    'Gross Profit': grossProfit,
                    'Total Commissions': totalCommissions,
                    'Net Profit': netProfit,
                    'Profit Margin %': totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
                },
                details: []
            }
        });
    }
    catch (error) {
        console.error('Error generating P&L report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Cash Flow Report
router.get('/cash-flow', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const receipts = await prisma.receipts.findMany({
            where: {
                receiptDate: { gte: startDate, lte: endDate }
            }
        });
        const payments = await prisma.payments.findMany({
            where: {
                paymentDate: { gte: startDate, lte: endDate }
            }
        });
        const totalInflows = receipts.reduce((sum, r) => sum + r.amount, 0);
        const totalOutflows = payments.reduce((sum, p) => sum + p.amount, 0);
        const netCashFlow = totalInflows - totalOutflows;
        res.json({
            success: true,
            data: {
                summary: {
                    'Total Inflows': totalInflows,
                    'Total Outflows': totalOutflows,
                    'Net Cash Flow': netCashFlow,
                },
                details: [
                    ...receipts.map(r => ({
                        Date: new Date(r.receiptDate).toLocaleDateString(),
                        Type: 'Inflow',
                        Reference: r.receiptNumber,
                        Amount: r.amount,
                        Method: r.paymentMethod,
                    })),
                    ...payments.map(p => ({
                        Date: new Date(p.paymentDate).toLocaleDateString(),
                        Type: 'Outflow',
                        Reference: p.paymentNumber,
                        Amount: -p.amount,
                        Method: p.paymentMethod,
                    }))
                ].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
            }
        });
    }
    catch (error) {
        console.error('Error generating cash flow report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Customer Statement Report
router.get('/customer-statement/:customerId', authenticate, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { dateFrom, dateTo, currency } = req.query;
        const targetCurrency = currency || 'AED';
        const bookings = await prisma.bookings.findMany({
            where: {
                customerId,
                bookingDate: { gte: new Date(dateFrom), lte: new Date(dateTo) }
            },
            orderBy: { bookingDate: 'asc' }
        });
        const receipts = await prisma.receipts.findMany({
            where: {
                customerId,
                receiptDate: { gte: new Date(dateFrom), lte: new Date(dateTo) }
            },
            orderBy: { receiptDate: 'asc' }
        });
        let balance = 0;
        const transactions = [];
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
    }
    catch (error) {
        console.error('Error generating customer statement:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Trial Balance Report
router.get('/trial-balance', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo, currency } = req.query;
        const accounts = await prisma.accounts.findMany({
            include: {
                journalEntryLines: {
                    where: {
                        journalEntry: {
                            date: { gte: new Date(dateFrom), lte: new Date(dateTo) }
                        }
                    }
                }
            }
        });
        const data = accounts.map(account => {
            const debit = account.journalEntryLines
                .filter(line => line.type === 'DEBIT')
                .reduce((sum, line) => sum + (line.amount || 0), 0);
            const credit = account.journalEntryLines
                .filter(line => line.type === 'CREDIT')
                .reduce((sum, line) => sum + (line.amount || 0), 0);
            return {
                accountCode: account.accountNumber,
                accountName: account.accountName,
                debit,
                credit
            };
        }).filter(a => a.debit !== 0 || a.credit !== 0);
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
    }
    catch (error) {
        console.error('Error generating trial balance:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Employee Commissions Monthly Report
router.get('/employee-commissions-monthly', authenticate, async (req, res) => {
    try {
        const { year, month, currency } = req.query;
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: { in: ['CONFIRMED', 'REFUND'] }
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
        const targetCurrency = currency || 'AED';
        bookings.forEach(booking => {
            const bookingAgent = booking.employees_bookings_bookingAgentIdToemployees;
            if (bookingAgent && booking.agentCommissionAmount) {
                const id = bookingAgent.id;
                const name = `${bookingAgent.users.firstName} ${bookingAgent.users.lastName}`;
                // Convert commission from booking's sale currency to target currency
                const commissionInTargetCurrency = convertCurrency(booking.agentCommissionAmount, booking.saleCurrency, targetCurrency);
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
                        }
                        else if (booking.serviceType === 'FLIGHT') {
                            // For flights, show route (from → to)
                            const from = details.departureCity || details.from || '';
                            const to = details.arrivalCity || details.to || '';
                            if (from && to) {
                                serviceDetailsText = `${from} → ${to}`;
                            }
                            else {
                                serviceDetailsText = details.airline || details.flightNumber || '';
                            }
                        }
                        else if (booking.serviceType === 'VISA') {
                            serviceDetailsText = details.country || details.destination || '';
                        }
                        else if (booking.serviceType === 'TRANSFER') {
                            serviceDetailsText = details.from && details.to ? `${details.from} → ${details.to}` : (details.route || '');
                        }
                        else if (booking.serviceType === 'CRUISE') {
                            serviceDetailsText = details.cruiseName || details.shipName || '';
                        }
                        else {
                            serviceDetailsText = details.description || details.name || '';
                        }
                    }
                }
                catch (e) {
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
                const commissionInTargetCurrency = convertCurrency(booking.csCommissionAmount, booking.saleCurrency, targetCurrency);
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
                        }
                        else if (booking.serviceType === 'FLIGHT') {
                            // For flights, show route (from → to)
                            const from = details.departureCity || details.from || '';
                            const to = details.arrivalCity || details.to || '';
                            if (from && to) {
                                serviceDetailsText = `${from} → ${to}`;
                            }
                            else {
                                serviceDetailsText = details.airline || details.flightNumber || '';
                            }
                        }
                        else if (booking.serviceType === 'VISA') {
                            serviceDetailsText = details.country || details.destination || '';
                        }
                        else if (booking.serviceType === 'TRANSFER') {
                            serviceDetailsText = details.from && details.to ? `${details.from} → ${details.to}` : (details.route || '');
                        }
                        else if (booking.serviceType === 'CRUISE') {
                            serviceDetailsText = details.cruiseName || details.shipName || '';
                        }
                        else {
                            serviceDetailsText = details.description || details.name || '';
                        }
                    }
                }
                catch (e) {
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
    }
    catch (error) {
        console.error('Error generating employee commissions report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Employee Commissions Monthly Report (Individual)
router.get('/employee-commissions-monthly/:employeeId', authenticate, async (req, res) => {
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
                status: { in: ['CONFIRMED', 'REFUND'] }
            },
            include: {
                customers: { select: { firstName: true, lastName: true, companyName: true } }
            }
        });
        const targetCurrency = currency || 'AED';
        const breakdown = bookings.map(b => {
            const agentCommission = b.agentCommissionAmount || 0;
            const csCommission = b.csCommissionAmount || 0;
            const totalCommissionInBookingCurrency = agentCommission + csCommission;
            // Convert to target currency
            const commissionInTargetCurrency = convertCurrency(totalCommissionInBookingCurrency, b.saleCurrency, targetCurrency);
            return {
                date: new Date(b.bookingDate).toLocaleDateString(),
                bookingNumber: b.bookingNumber,
                customer: b.customers?.companyName || `${b.customers?.firstName || ''} ${b.customers?.lastName || ''}`.trim() || 'N/A',
                commission: commissionInTargetCurrency
            };
        });
        const totalCommission = breakdown.reduce((sum, b) => sum + b.commission, 0);
        res.json({
            success: true,
            data: {
                employees: [{
                        employeeName: 'Selected Employee',
                        totalBookings: bookings.length,
                        totalCommission,
                        averageCommission: bookings.length > 0 ? totalCommission / bookings.length : 0,
                        currency: currency || 'AED',
                        breakdown
                    }],
                summary: {
                    totalEmployees: 1,
                    totalBookings: bookings.length,
                    totalCommissions: totalCommission,
                    averagePerEmployee: totalCommission
                }
            }
        });
    }
    catch (error) {
        console.error('Error generating employee report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// VAT Return Report (UAE)
router.get('/vat-return', authenticate, async (req, res) => {
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
    }
    catch (error) {
        console.error('Error generating VAT return:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
// Export endpoints (placeholder for Excel export)
router.get('/:reportType/export', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Export functionality will be implemented with Excel library'
        });
    }
    catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ success: false, error: 'Failed to export report' });
    }
});
// Supplier Statement Report
router.get('/supplier-statement/:supplierId', authenticate, async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { dateFrom, dateTo, currency = 'AED' } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
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
                date: { gte: startDate, lte: endDate }
            },
            orderBy: { date: 'asc' }
        });
        // Calculate opening balance (all transactions before dateFrom)
        const previousBookings = await prisma.bookings.findMany({
            where: { supplierId, bookingDate: { lt: startDate } }
        });
        const previousPayments = await prisma.payments.findMany({
            where: { supplierId, date: { lt: startDate } }
        });
        const targetCurrency = currency || 'AED';
        let openingBalance = 0;
        previousBookings.forEach(b => {
            openingBalance += convertCurrency(b.costAmount, b.costCurrency, targetCurrency);
        });
        previousPayments.forEach(p => {
            openingBalance -= convertCurrency(p.amount, p.currency || 'AED', targetCurrency);
        });
        // Build transactions array
        const transactions = [];
        let totalDebit = 0;
        let totalCredit = 0;
        let runningBalance = openingBalance;
        // Add bookings (Credits - we owe supplier) - convert to target currency
        bookings.forEach(b => {
            const amount = convertCurrency(b.costAmount, b.costCurrency, targetCurrency);
            runningBalance += amount;
            totalCredit += amount;
            transactions.push({
                Date: b.bookingDate.toISOString(),
                Type: 'Booking',
                Reference: b.bookingNumber,
                Description: `Booking ${b.bookingNumber}`,
                Debit: 0,
                Credit: amount,
                Balance: runningBalance
            });
        });
        // Add payments (Debits - we paid supplier) - convert to target currency
        payments.forEach(p => {
            const amount = convertCurrency(p.amount, p.currency || 'AED', targetCurrency);
            runningBalance -= amount;
            totalDebit += amount;
            transactions.push({
                Date: p.date.toISOString(),
                Type: 'Payment',
                Reference: p.paymentNumber,
                Description: p.description || 'Payment',
                Debit: amount,
                Credit: 0,
                Balance: runningBalance
            });
        });
        // Sort by date
        transactions.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
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
    }
    catch (error) {
        console.error('Error generating supplier statement:', error);
        res.status(500).json({ success: false, error: 'Failed to generate supplier statement' });
    }
});
// Financial Summary Report
router.get('/financial-summary', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo, currency = 'AED' } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        // Get all bookings in period
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: { in: ['CONFIRMED', 'REFUND'] }
            },
            orderBy: { bookingDate: 'asc' }
        });
        // Calculate totals
        let totalRevenue = 0;
        let totalCost = 0;
        let totalCommissions = 0;
        bookings.forEach(b => {
            totalRevenue += convertToAED(b.saleAmount, b.saleCurrency);
            totalCost += convertToAED(b.costAmount, b.costCurrency);
            totalCommissions += convertToAED(b.totalCommission || 0, b.saleCurrency);
        });
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalCommissions;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';
        // Monthly breakdown
        const monthlyData = {};
        bookings.forEach(b => {
            const monthKey = b.bookingDate.toISOString().substring(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    revenue: 0,
                    cost: 0,
                    commissions: 0,
                    bookings: 0
                };
            }
            monthlyData[monthKey].revenue += convertToAED(b.saleAmount, b.saleCurrency);
            monthlyData[monthKey].cost += convertToAED(b.costAmount, b.costCurrency);
            monthlyData[monthKey].commissions += convertToAED(b.totalCommission || 0, b.saleCurrency);
            monthlyData[monthKey].bookings += 1;
        });
        const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
            Month: month,
            Revenue: data.revenue,
            Cost: data.cost,
            'Gross Profit': data.revenue - data.cost,
            Commissions: data.commissions,
            'Net Profit': (data.revenue - data.cost - data.commissions),
            Bookings: data.bookings
        }));
        res.json({
            success: true,
            data: {
                totalRevenue,
                totalCost,
                grossProfit,
                totalCommissions,
                netProfit,
                profitMargin: parseFloat(profitMargin),
                monthlyBreakdown
            }
        });
    }
    catch (error) {
        console.error('Error generating financial summary:', error);
        res.status(500).json({ success: false, error: 'Failed to generate financial summary' });
    }
});
// Profit & Loss Report
router.get('/profit-loss', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo, currency = 'AED' } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        // Get all bookings
        const bookings = await prisma.bookings.findMany({
            where: {
                bookingDate: { gte: startDate, lte: endDate },
                status: { in: ['CONFIRMED', 'REFUND'] }
            }
        });
        // Calculate P&L components
        let totalRevenue = 0;
        let totalCost = 0;
        let totalCommissions = 0;
        bookings.forEach(b => {
            totalRevenue += convertToAED(b.saleAmount, b.saleCurrency);
            totalCost += convertToAED(b.costAmount, b.costCurrency);
            totalCommissions += convertToAED(b.totalCommission || 0, b.saleCurrency);
        });
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalCommissions;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';
        res.json({
            success: true,
            data: {
                totalRevenue,
                totalCost,
                grossProfit,
                totalCommissions,
                netProfit,
                profitMargin: parseFloat(profitMargin)
            }
        });
    }
    catch (error) {
        console.error('Error generating P&L report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate P&L report' });
    }
});
// Cash Flow Report
router.get('/cash-flow', authenticate, async (req, res) => {
    try {
        const { dateFrom, dateTo, currency = 'AED' } = req.query;
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        // Get all receipts (cash inflows)
        const receipts = await prisma.receipts.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            include: {
                customers: { select: { firstName: true, lastName: true, companyName: true } }
            },
            orderBy: { date: 'asc' }
        });
        // Get all payments (cash outflows)
        const payments = await prisma.payments.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            include: {
                suppliers: { select: { companyName: true } }
            },
            orderBy: { date: 'asc' }
        });
        let totalInflows = 0;
        let totalOutflows = 0;
        const details = [];
        // Add receipts (inflows)
        receipts.forEach(r => {
            const amount = convertToAED(r.amount, r.currency || 'AED');
            totalInflows += amount;
            details.push({
                Date: r.date.toISOString(),
                Type: 'Inflow',
                Reference: r.receiptNumber,
                Method: r.paymentMethod,
                Amount: amount
            });
        });
        // Add payments (outflows)
        payments.forEach(p => {
            const amount = convertToAED(p.amount, p.currency || 'AED');
            totalOutflows += amount;
            details.push({
                Date: p.date.toISOString(),
                Type: 'Outflow',
                Reference: p.paymentNumber,
                Method: p.paymentMethod,
                Amount: -amount
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
    }
    catch (error) {
        console.error('Error generating cash flow report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate cash flow report' });
    }
});
export default router;
