import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
/**
 * Accounting Service
 * Automatically creates journal entries for all financial transactions
 */
export class AccountingService {
    /**
     * Get revenue account code based on service type
     */
    getRevenueAccountCode(serviceType) {
        const serviceAccountMap = {
            'FLIGHT': '4110',
            'HOTEL': '4120',
            'VISA': '4130',
            'TRANSFER': '4140',
            'RENT_CAR': '4150',
            'TRAIN': '4140',
            'CRUISE': '4160',
            'ACTIVITY': '4170'
        };
        return serviceAccountMap[serviceType] || '4200'; // Default to Other Revenue
    }
    /**
     * Create journal entry for booking creation
     * Records cost and revenue
     * Handles both single and multi-supplier bookings
     */
    async createBookingJournalEntry(booking) {
        try {
            // Check if this is a multi-supplier booking
            const isMultiSupplier = booking.booking_suppliers && booking.booking_suppliers.length > 0;
            // Generate entry number
            const lastEntry = await prisma.journal_entries.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            let nextNumber = 1;
            if (lastEntry && lastEntry.entryNumber) {
                const match = lastEntry.entryNumber.match(/JE-(\d+)/);
                if (match)
                    nextNumber = parseInt(match[1]) + 1;
            }
            const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
            // Find account IDs by code
            const supplierPayableAccount = await prisma.accounts.findFirst({
                where: { code: '2110' } // Accounts Payable
            });
            const costOfSalesAccount = await prisma.accounts.findFirst({
                where: { code: '5110' } // Cost of Sales
            });
            if (!supplierPayableAccount || !costOfSalesAccount) {
                console.warn('⚠️  Accounting accounts not found, skipping journal entry');
                return;
            }
            if (isMultiSupplier) {
                // Multi-supplier: Create entry for each supplier
                for (const supplier of booking.booking_suppliers) {
                    const supplierEntryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
                    nextNumber++;
                    const costInAED = Math.round(supplier.costInAED * 100) / 100;
                    const created = await prisma.journal_entries.create({
                        data: {
                            id: randomUUID(),
                            entryNumber: supplierEntryNumber,
                            date: booking.bookingDate || new Date(),
                            description: `Booking ${booking.bookingNumber} - Cost to ${supplier.suppliers?.companyName || 'Supplier'}`,
                            reference: booking.bookingNumber,
                            debitAccountId: costOfSalesAccount.id,
                            creditAccountId: supplierPayableAccount.id,
                            amount: costInAED,
                            bookingId: booking.id,
                            transactionType: 'BOOKING_COST',
                            status: 'DRAFT',
                            createdBy: booking.createdById,
                            updatedAt: new Date()
                        }
                    });
                    // Auto-post created entry to update account balances
                    await this.postJournalEntry(created.id);
                    console.log(`✅ Created booking cost journal entry for supplier: ${supplierEntryNumber}`);
                }
            }
            else {
                // Single supplier: Create one entry
                const costInAED = Math.round(booking.costInAED * 100) / 100;
                const created = await prisma.journal_entries.create({
                    data: {
                        id: randomUUID(),
                        entryNumber,
                        date: booking.bookingDate || new Date(),
                        description: `Booking ${booking.bookingNumber} - Cost to ${booking.suppliers?.companyName || 'Supplier'}`,
                        reference: booking.bookingNumber,
                        debitAccountId: costOfSalesAccount.id,
                        creditAccountId: supplierPayableAccount.id,
                        amount: costInAED,
                        bookingId: booking.id,
                        transactionType: 'BOOKING_COST',
                        status: 'DRAFT',
                        createdBy: booking.createdById,
                        updatedAt: new Date()
                    }
                });
                // Auto-post created entry to update account balances
                await this.postJournalEntry(created.id);
                console.log(`✅ Created booking cost journal entry: ${entryNumber}`);
            }
        }
        catch (error) {
            console.error('❌ Error creating booking journal entry:', error.message);
        }
    }
    /**
     * Create journal entry for invoice generation
     * Records accounts receivable and revenue
     * Handles UAE Booking vs Non-UAE Booking VAT calculation
     */
    async createInvoiceJournalEntry(invoice) {
        try {
            // Generate entry number
            const lastEntry = await prisma.journal_entries.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            let nextNumber = 1;
            if (lastEntry && lastEntry.entryNumber) {
                const match = lastEntry.entryNumber.match(/JE-(\d+)/);
                if (match)
                    nextNumber = parseInt(match[1]) + 1;
            }
            const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
            // Find account IDs
            const accountsReceivableAccount = await prisma.accounts.findFirst({
                where: { code: '1130' } // Accounts Receivable
            });
            const revenueCode = this.getRevenueAccountCode(invoice.bookings?.serviceType || 'OTHER');
            const revenueAccount = await prisma.accounts.findFirst({
                where: { code: revenueCode }
            });
            if (!accountsReceivableAccount || !revenueAccount) {
                console.warn('⚠️  Accounting accounts not found, skipping journal entry');
                return;
            }
            // Round amounts to 2 decimals
            const subtotal = Math.round(invoice.subtotal * 100) / 100;
            const vatAmount = Math.round((invoice.vatAmount || 0) * 100) / 100;
            const totalAmount = Math.round(invoice.totalAmount * 100) / 100;
            // Entry: Debit A/R, Credit Revenue (for subtotal)
            const revenueEntry = await prisma.journal_entries.create({
                data: {
                    id: randomUUID(),
                    entryNumber,
                    date: invoice.invoiceDate || new Date(),
                    description: `Invoice ${invoice.invoiceNumber} - Revenue from ${invoice.customers?.firstName || 'Customer'}`,
                    reference: invoice.invoiceNumber,
                    debitAccountId: accountsReceivableAccount.id,
                    creditAccountId: revenueAccount.id,
                    amount: subtotal,
                    invoiceId: invoice.id,
                    transactionType: 'INVOICE_REVENUE',
                    status: 'DRAFT',
                    createdBy: invoice.createdById,
                    updatedAt: new Date()
                }
            });
            // Auto-post revenue entry
            await this.postJournalEntry(revenueEntry.id);
            // If there's VAT, create separate entry
            if (vatAmount > 0) {
                const vatPayableAccount = await prisma.accounts.findFirst({
                    where: { code: '2130' } // VAT Payable
                });
                if (vatPayableAccount) {
                    const vatEntryNumber = `JE-${String(nextNumber + 1).padStart(6, '0')}`;
                    // Check if this is UAE Booking or Non-UAE
                    const isUAEBooking = invoice.bookings?.isUAEBooking || false;
                    const description = isUAEBooking
                        ? `Invoice ${invoice.invoiceNumber} - VAT Payable (UAE - extracted from total)`
                        : `Invoice ${invoice.invoiceNumber} - VAT Payable (5% on net profit)`;
                    const vatEntry = await prisma.journal_entries.create({
                        data: {
                            id: randomUUID(),
                            entryNumber: vatEntryNumber,
                            date: invoice.invoiceDate || new Date(),
                            description,
                            reference: invoice.invoiceNumber,
                            debitAccountId: accountsReceivableAccount.id,
                            creditAccountId: vatPayableAccount.id,
                            amount: vatAmount,
                            invoiceId: invoice.id,
                            transactionType: isUAEBooking ? 'INVOICE_VAT_UAE' : 'INVOICE_VAT_NON_UAE',
                            status: 'DRAFT',
                            createdBy: invoice.createdById,
                            updatedAt: new Date()
                        }
                    });
                    // Auto-post VAT entry
                    await this.postJournalEntry(vatEntry.id);
                }
            }
            console.log(`✅ Created invoice journal entries: ${entryNumber}`);
        }
        catch (error) {
            console.error('❌ Error creating invoice journal entry:', error.message);
        }
    }
    /**
     * Create journal entry for payment received
     * Records cash/bank and reduces accounts receivable
     */
    async createReceiptJournalEntry(receipt) {
        try {
            // Generate entry number
            const lastEntry = await prisma.journal_entries.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            let nextNumber = 1;
            if (lastEntry && lastEntry.entryNumber) {
                const match = lastEntry.entryNumber.match(/JE-(\d+)/);
                if (match)
                    nextNumber = parseInt(match[1]) + 1;
            }
            const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
            // Determine cash/bank account
            const cashAccountCode = receipt.paymentMethod === 'CASH' ? '1110' : '1120';
            const cashAccount = await prisma.accounts.findFirst({
                where: { code: cashAccountCode }
            });
            const accountsReceivableAccount = await prisma.accounts.findFirst({
                where: { code: '1130' } // Accounts Receivable
            });
            if (!cashAccount || !accountsReceivableAccount) {
                console.warn('⚠️  Accounting accounts not found, skipping journal entry');
                return;
            }
            // Round amount to 2 decimals
            const amount = Math.round(receipt.amount * 100) / 100;
            // Entry: Debit Cash/Bank, Credit A/R
            const receiptEntry = await prisma.journal_entries.create({
                data: {
                    id: randomUUID(),
                    entryNumber,
                    date: receipt.receiptDate || new Date(),
                    description: `Receipt ${receipt.receiptNumber} - Payment from ${receipt.customers?.firstName || 'Customer'} (${receipt.paymentMethod})`,
                    reference: receipt.receiptNumber,
                    debitAccountId: cashAccount.id,
                    creditAccountId: accountsReceivableAccount.id,
                    amount,
                    transactionType: 'RECEIPT_PAYMENT',
                    status: 'DRAFT',
                    createdBy: receipt.createdById,
                    updatedAt: new Date()
                }
            });
            // Auto-post receipt entry
            await this.postJournalEntry(receiptEntry.id);
            console.log(`✅ Created receipt journal entry: ${entryNumber}`);
        }
        catch (error) {
            console.error('❌ Error creating receipt journal entry:', error.message);
        }
    }
    /**
     * Create journal entry for commission payment
     * Records commission expense and payable to employee
     */
    async createCommissionJournalEntry(booking, employeeType) {
        try {
            const amount = employeeType === 'AGENT' ? booking.agentCommissionAmount : booking.csCommissionAmount;
            if (!amount || amount === 0) {
                return; // No commission to record
            }
            // Round commission amount to 2 decimals
            const commissionAmount = Math.round(amount * 100) / 100;
            // Generate entry number
            const lastEntry = await prisma.journal_entries.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            let nextNumber = 1;
            if (lastEntry && lastEntry.entryNumber) {
                const match = lastEntry.entryNumber.match(/JE-(\d+)/);
                if (match)
                    nextNumber = parseInt(match[1]) + 1;
            }
            const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
            // Find accounts
            const commissionExpenseAccount = await prisma.accounts.findFirst({
                where: { code: '5220' } // Commission Expense
            });
            const accountsPayableAccount = await prisma.accounts.findFirst({
                where: { code: '2110' } // Accounts Payable
            });
            if (!commissionExpenseAccount || !accountsPayableAccount) {
                console.warn('⚠️  Accounting accounts not found, skipping journal entry');
                return;
            }
            const employeeLabel = employeeType === 'AGENT' ? 'Booking Agent' : 'Sales Agent';
            // Entry: Debit Commission Expense, Credit A/P
            const commissionEntry = await prisma.journal_entries.create({
                data: {
                    id: randomUUID(),
                    entryNumber,
                    date: booking.bookingDate || new Date(),
                    description: `Commission ${employeeLabel} for booking ${booking.bookingNumber}`,
                    reference: booking.bookingNumber,
                    debitAccountId: commissionExpenseAccount.id,
                    creditAccountId: accountsPayableAccount.id,
                    amount: commissionAmount,
                    bookingId: booking.id,
                    transactionType: `COMMISSION_${employeeType}`,
                    status: 'DRAFT',
                    createdBy: booking.createdById,
                    updatedAt: new Date()
                }
            });
            // Auto-post commission entry
            await this.postJournalEntry(commissionEntry.id);
            console.log(`✅ Created commission journal entry (${employeeLabel}): ${entryNumber}`);
        }
        catch (error) {
            console.error('❌ Error creating commission journal entry:', error.message);
        }
    }
    /**
     * Post journal entry - update account balances
     * All amounts are rounded to 2 decimal places
     */
    async postJournalEntry(entryId) {
        try {
            const entry = await prisma.journal_entries.findUnique({
                where: { id: entryId }
            });
            if (!entry) {
                throw new Error('Journal entry not found');
            }
            if (entry.status === 'POSTED') {
                throw new Error('Journal entry already posted');
            }
            // Round amount to 2 decimals
            const amount = Math.round(entry.amount * 100) / 100;
            // Fetch account types to apply correct sign rules
            const [debitAccount, creditAccount] = await Promise.all([
                prisma.accounts.findUnique({ where: { id: entry.debitAccountId } }),
                prisma.accounts.findUnique({ where: { id: entry.creditAccountId } })
            ]);
            if (!debitAccount || !creditAccount) {
                throw new Error('Related accounts not found for journal entry');
            }
            // Balance sign rules by account type
            // Assets & Expenses increase with debits and decrease with credits
            // Liabilities, Equity & Revenue decrease with debits and increase with credits
            const isDebitPositiveType = debitAccount.type === 'ASSET' || debitAccount.type === 'EXPENSE';
            const isCreditPositiveType = creditAccount.type === 'LIABILITY' || creditAccount.type === 'EQUITY' || creditAccount.type === 'REVENUE';
            const debitBalanceDelta = isDebitPositiveType ? amount : -amount;
            const creditBalanceDelta = isCreditPositiveType ? amount : -amount;
            // Update account balances in a transaction
            await prisma.$transaction([
                // Update debit account
                prisma.accounts.update({
                    where: { id: entry.debitAccountId },
                    data: {
                        debitBalance: { increment: amount },
                        balance: { increment: debitBalanceDelta },
                        updatedAt: new Date()
                    }
                }),
                // Update credit account
                prisma.accounts.update({
                    where: { id: entry.creditAccountId },
                    data: {
                        creditBalance: { increment: amount },
                        balance: { increment: creditBalanceDelta },
                        updatedAt: new Date()
                    }
                }),
                // Mark entry as posted
                prisma.journal_entries.update({
                    where: { id: entryId },
                    data: {
                        status: 'POSTED',
                        postedDate: new Date(),
                        updatedAt: new Date()
                    }
                })
            ]);
            console.log(`✅ Posted journal entry: ${entry.entryNumber}`);
        }
        catch (error) {
            console.error('❌ Error posting journal entry:', error.message);
            throw error;
        }
    }
}
export const accountingService = new AccountingService();
