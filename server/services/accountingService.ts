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
  private getRevenueAccountCode(serviceType: string): string {
    const serviceAccountMap: Record<string, string> = {
      'FLIGHT': '4110',      // Flight Booking Revenue
      'HOTEL': '4120',       // Hotel Booking Revenue
      'VISA': '4130',        // Visa Services Revenue
      'TRANSFER': '4140',    // Transfer Services Revenue
      'RENTAL_CAR': '4150',  // Car Rental Revenue
      'RENT_CAR': '4150',    // Car Rental Revenue (alias)
      'CRUISE': '4160',      // Cruise Booking Revenue
      'TRAIN': '4170',       // Train Tickets Revenue
      'ACTIVITY': '4180',    // Activity Booking Revenue
      'PACKAGE': '4160',     // Tourism Package Revenue (same as cruise)
      'UMRAH': '4180'        // Other Services Revenue
    };
    return serviceAccountMap[serviceType] || '4180'; // Default to Activity/Other Services
  }

  /**
   * Get operating cost account code based on service type
   */
  private getCostAccountCode(serviceType: string): string {
    const costAccountMap: Record<string, string> = {
      'FLIGHT': '5110',      // Flight Ticket Costs
      'HOTEL': '5120',       // Hotel Accommodation Costs
      'VISA': '5130',        // Visa Processing Costs
      'TRANSFER': '5140',    // Transfer Services Costs
      'RENTAL_CAR': '5150',  // Car Rental Costs
      'RENT_CAR': '5150',    // Car Rental Costs (alias)
      'CRUISE': '5160',      // Cruise Booking Costs
      'TRAIN': '5170',       // Train Tickets Costs
      'ACTIVITY': '5180',    // Activity Booking Costs
      'PACKAGE': '5160',     // Tourism Package Costs (same as cruise)
      'UMRAH': '5180'        // Other Services Costs
    };
    return costAccountMap[serviceType] || '5180'; // Default to Activity/Other Costs
  }

  /**
   * Create journal entry for booking creation
   * Records cost and revenue
   * Handles both single and multi-supplier bookings
   */
  async createBookingJournalEntry(booking: any): Promise<void> {
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
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;

      // Find account IDs by code
      const supplierPayableAccount = await prisma.accounts.findFirst({
        where: { code: '2111' } // Accounts Payable - Suppliers
      });
      
      // Get correct cost account based on service type
      const costAccountCode = this.getCostAccountCode(booking.serviceType || 'OTHER');
      const costOfSalesAccount = await prisma.accounts.findFirst({
        where: { code: costAccountCode }
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
              description: `تكلفة حجز - ${booking.bookingNumber}`,
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
      } else {
        // Single supplier: Create one entry
        const costInAED = Math.round(booking.costInAED * 100) / 100;
        
        const created = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.bookingDate || new Date(),
            description: `تكلفة حجز - ${booking.bookingNumber}`,
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
    } catch (error: any) {
      console.error('❌ Error creating booking journal entry:', error.message);
    }
  }

  /**
   * Create journal entry for invoice generation
   * Records accounts receivable and revenue
   * Handles UAE Booking vs Non-UAE Booking VAT calculation
   */
  async createInvoiceJournalEntry(invoice: any): Promise<void> {
    try {
      // Generate entry number
      const lastEntry = await prisma.journal_entries.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      let nextNumber = 1;
      if (lastEntry && lastEntry.entryNumber) {
        const match = lastEntry.entryNumber.match(/JE-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;

      // Find account IDs
      const accountsReceivableAccount = await prisma.accounts.findFirst({
        where: { code: '1151' } // Accounts Receivable - Customers (NEW CODE)
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
          description: `إيراد فاتورة - ${invoice.invoiceNumber}`,
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
          where: { code: '2131' } // VAT Payable (UPDATED CODE)
        });

        if (vatPayableAccount) {
          const vatEntryNumber = `JE-${String(nextNumber + 1).padStart(6, '0')}`;
          
          // Check if this is UAE Booking or Non-UAE
          const isUAEBooking = invoice.bookings?.isUAEBooking || false;
          const description = `ضريبة قيمة مضافة - ${invoice.invoiceNumber}`;
          
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
    } catch (error: any) {
      console.error('❌ Error creating invoice journal entry:', error.message);
    }
  }

  /**
   * Create journal entry for payment received
   * Records cash/bank and reduces accounts receivable
   */
  async createReceiptJournalEntry(receipt: any): Promise<void> {
    try {
      // Generate entry number
      const lastEntry = await prisma.journal_entries.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      let nextNumber = 1;
      if (lastEntry && lastEntry.entryNumber) {
        const match = lastEntry.entryNumber.match(/JE-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;

      // Determine cash/bank account
      const cashAccountCode = receipt.paymentMethod === 'CASH' ? '1111' : '1117'; // Cash on Hand - AED or Bank Account - AED (UPDATED)
      const cashAccount = await prisma.accounts.findFirst({
        where: { code: cashAccountCode }
      });

      const accountsReceivableAccount = await prisma.accounts.findFirst({
        where: { code: '1151' } // Accounts Receivable - Customers (NEW CODE)
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
          description: `سداد - ${receipt.receiptNumber}`,
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
    } catch (error: any) {
      console.error('❌ Error creating receipt journal entry:', error.message);
    }
  }

  /**
   * Create journal entry for commission payment
   * Records commission expense and payable to employee
   */
  async createCommissionJournalEntry(booking: any, employeeType: 'AGENT' | 'CS'): Promise<void> {
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
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;

      // Find accounts - use Employee Commissions account (6120)
      // All commissions (Agent + CS) go to the same expense account
      const commissionExpenseAccount = await prisma.accounts.findFirst({
        where: { code: '6120' } // Employee Commissions
      });

      const accountsPayableAccount = await prisma.accounts.findFirst({
        where: { code: '2142' } // Commissions Payable
      });

      if (!commissionExpenseAccount || !accountsPayableAccount) {
        console.warn(`⚠️  Accounting accounts not found (6120 or 2142), skipping journal entry`);
        return;
      }

      const employeeLabel = employeeType === 'AGENT' ? 'عمولة موظف حجز' : 'عمولة خدمة عملاء';

      // Entry: Debit Commission Expense, Credit A/P
      const commissionEntry = await prisma.journal_entries.create({
        data: {
          id: randomUUID(),
          entryNumber,
          date: booking.bookingDate || new Date(),
          description: `${employeeLabel} - ${booking.bookingNumber}`,
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
    } catch (error: any) {
      console.error('❌ Error creating commission journal entry:', error.message);
    }
  }

  /**
   * Post journal entry - update account balances
   * All amounts are rounded to 2 decimal places
   */
  async postJournalEntry(entryId: string): Promise<void> {
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
      
      // Update parent account balances
      await this.updateParentAccountBalances(entry.debitAccountId);
      await this.updateParentAccountBalances(entry.creditAccountId);
    } catch (error: any) {
      console.error('❌ Error posting journal entry:', error.message);
      throw error;
    }
  }

  /**
   * Update parent account balances recursively
   * This updates all parent accounts including root accounts (1000, 2000, etc)
   */
  private async updateParentAccountBalances(accountId: string): Promise<void> {
    try {
      const account = await prisma.accounts.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        return;
      }

      // If this account has no parent, it's a root account - check if it has children
      if (!account.parentId) {
        // Check if this is a parent account by seeing if it has children
        const children = await prisma.accounts.findMany({
          where: { parentId: account.id }
        });

        if (children.length > 0) {
          // This is a root parent account, update it
          await this.updateAccountFromChildren(account.id);
        }
        return;
      }

      // Get parent and update it
      const parent = await prisma.accounts.findUnique({
        where: { id: account.parentId }
      });

      if (!parent) return;

      // Update the parent's balances from its children
      await this.updateAccountFromChildren(parent.id);

      // Recursively update grandparent
      await this.updateParentAccountBalances(parent.id);
    } catch (error: any) {
      console.error('❌ Error updating parent account balances:', error.message);
    }
  }

  /**
   * Update an account's balances from its direct children
   */
  private async updateAccountFromChildren(accountId: string): Promise<void> {
    try {
      // Get the account
      const account = await prisma.accounts.findUnique({
        where: { id: accountId }
      });

      if (!account) return;

      // Get all children of this account
      const children = await prisma.accounts.findMany({
        where: { parentId: accountId }
      });

      if (children.length === 0) return;

      // Calculate totals from children
      const totalDebit = children.reduce((sum, child) => sum + Number(child.debitBalance || 0), 0);
      const totalCredit = children.reduce((sum, child) => sum + Number(child.creditBalance || 0), 0);

      // Calculate balance based on account type
      let balance = 0;
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        balance = totalDebit - totalCredit;
      } else {
        balance = totalCredit - totalDebit;
      }

      // Update parent account
      await prisma.accounts.update({
        where: { id: accountId },
        data: {
          debitBalance: totalDebit,
          creditBalance: totalCredit,
          balance: balance,
          updatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('❌ Error updating account from children:', error.message);
    }
  }

  /**
   * Update journal entries for booking changes
   * Deletes old entries and creates new ones with updated amounts
   */
  async updateBookingJournalEntries(bookingId: string): Promise<void> {
    try {
      console.log('\n🔄 Updating journal entries for booking...');
      
      // Get booking with all relations
      const booking = await prisma.bookings.findUnique({
        where: { id: bookingId },
        include: {
          suppliers: true,
          customers: true,
          users: true,
          booking_suppliers: {
            include: {
              suppliers: true
            }
          }
        }
      });

      if (!booking) {
        console.warn('⚠️  Booking not found, cannot update journal entries');
        return;
      }

      // 🗑️ DELETE old booking journal entries (DRAFT and POSTED)
      console.log('🗑️  Deleting old booking journal entries...');
      const deletedEntries = await prisma.journal_entries.deleteMany({
        where: { 
          bookingId: bookingId,
          transactionType: {
            in: ['BOOKING_COST', 'COMMISSION_AGENT', 'COMMISSION_CS']
          }
        }
      });
      console.log(`   Deleted ${deletedEntries.count} old booking entries`);

      // 🎯 CREATE new journal entries with updated amounts
      console.log('📝 Creating new booking journal entries...');
      
      // 1. Create booking cost entries
      await this.createBookingJournalEntry(booking);
      
      // 2. Create commission entries if applicable
      if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
        await this.createCommissionJournalEntry(booking, 'AGENT');
      }
      
      if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
        await this.createCommissionJournalEntry(booking, 'CS');
      }

      console.log('✅ Booking journal entries updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating booking journal entries:', error.message);
    }
  }

  /**
   * Create reverse journal entries for refunded booking
   * Reverses all original entries (revenue, cost, commissions)
   */
  async createRefundJournalEntries(booking: any): Promise<void> {
    try {
      // Generate entry numbers
      const lastEntry = await prisma.journal_entries.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      let nextNumber = 1;
      if (lastEntry && lastEntry.entryNumber) {
        const match = lastEntry.entryNumber.match(/JE-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }

      // Find account IDs
      const accountsReceivableAccount = await prisma.accounts.findFirst({
        where: { code: '1151' } // Accounts Receivable (NEW CODE)
      });
      const supplierPayableAccount = await prisma.accounts.findFirst({
        where: { code: '2111' } // Accounts Payable
      });
      const vatPayableAccount = await prisma.accounts.findFirst({
        where: { code: '2131' } // VAT Payable (UPDATED CODE)
      });
      const commissionPayableAccount = await prisma.accounts.findFirst({
        where: { code: '2142' } // Commission Payable (UPDATED CODE)
      });
      const commissionExpenseAccount = await prisma.accounts.findFirst({
        where: { code: '6120' } // Commission Expense
      });

      const revenueCode = this.getRevenueAccountCode(booking.serviceType || 'OTHER');
      const revenueAccount = await prisma.accounts.findFirst({
        where: { code: revenueCode }
      });

      const costCode = this.getCostAccountCode(booking.serviceType || 'OTHER');
      const costAccount = await prisma.accounts.findFirst({
        where: { code: costCode }
      });

      if (!accountsReceivableAccount || !revenueAccount || !costAccount || !supplierPayableAccount) {
        console.warn('⚠️  Required accounting accounts not found, skipping refund entries');
        return;
      }

      // 1. Reverse Revenue Entry (Debit: Revenue, Credit: A/R)
      if (booking.netBeforeVAT && booking.netBeforeVAT > 0) {
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        nextNumber++;
        
        const entry = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.updatedAt || new Date(),
            description: `استرجاع إيراد - ${booking.bookingNumber}`,
            reference: booking.bookingNumber,
            debitAccountId: revenueAccount.id,
            creditAccountId: accountsReceivableAccount.id,
            amount: Math.round(booking.netBeforeVAT * 100) / 100,
            bookingId: booking.id,
            transactionType: 'REFUND_REVENUE',
            status: 'DRAFT',
            createdBy: booking.createdById,
            updatedAt: new Date()
          }
        });
        await this.postJournalEntry(entry.id);
        console.log(`✅ Created refund revenue entry: ${entryNumber}`);
      }

      // 2. Reverse VAT Entry (if applicable)
      if (booking.vatAmount && booking.vatAmount > 0 && vatPayableAccount) {
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        nextNumber++;
        
        const entry = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.updatedAt || new Date(),
            description: `استرجاع ضريبة - ${booking.bookingNumber}`,
            reference: booking.bookingNumber,
            debitAccountId: vatPayableAccount.id,
            creditAccountId: accountsReceivableAccount.id,
            amount: Math.round(booking.vatAmount * 100) / 100,
            bookingId: booking.id,
            transactionType: 'REFUND_VAT',
            status: 'DRAFT',
            createdBy: booking.createdById,
            updatedAt: new Date()
          }
        });
        await this.postJournalEntry(entry.id);
        console.log(`✅ Created refund VAT entry: ${entryNumber}`);
      }

      // 3. Reverse Cost Entry (Debit: A/P, Credit: Cost)
      if (booking.costInAED && booking.costInAED > 0) {
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        nextNumber++;
        
        const entry = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.updatedAt || new Date(),
            description: `استرجاع تكلفة - ${booking.bookingNumber}`,
            reference: booking.bookingNumber,
            debitAccountId: supplierPayableAccount.id,
            creditAccountId: costAccount.id,
            amount: Math.round(booking.costInAED * 100) / 100,
            bookingId: booking.id,
            transactionType: 'REFUND_COST',
            status: 'DRAFT',
            createdBy: booking.createdById,
            updatedAt: new Date()
          }
        });
        await this.postJournalEntry(entry.id);
        console.log(`✅ Created refund cost entry: ${entryNumber}`);
      }

      // 4. Reverse Agent Commission (if applicable)
      if (booking.agentCommissionAmount && Math.abs(booking.agentCommissionAmount) > 0 && commissionPayableAccount && commissionExpenseAccount) {
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        nextNumber++;
        const commAmount = Math.abs(booking.agentCommissionAmount);
        
        const entry = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.updatedAt || new Date(),
            description: `استرجاع عمولة موظف حجز - ${booking.bookingNumber}`,
            reference: booking.bookingNumber,
            debitAccountId: commissionPayableAccount.id,
            creditAccountId: commissionExpenseAccount.id,
            amount: Math.round(commAmount * 100) / 100,
            bookingId: booking.id,
            transactionType: 'REFUND_COMMISSION_AGENT',
            status: 'DRAFT',
            createdBy: booking.createdById,
            updatedAt: new Date()
          }
        });
        await this.postJournalEntry(entry.id);
        console.log(`✅ Created refund agent commission entry: ${entryNumber}`);
      }

      // 5. Reverse CS Commission (if applicable)
      if (booking.csCommissionAmount && booking.csCommissionAmount > 0 && commissionPayableAccount && commissionExpenseAccount) {
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        nextNumber++;
        
        const entry = await prisma.journal_entries.create({
          data: {
            id: randomUUID(),
            entryNumber,
            date: booking.updatedAt || new Date(),
            description: `استرجاع عمولة خدمة عملاء - ${booking.bookingNumber}`,
            reference: booking.bookingNumber,
            debitAccountId: commissionPayableAccount.id,
            creditAccountId: commissionExpenseAccount.id,
            amount: Math.round(booking.csCommissionAmount * 100) / 100,
            bookingId: booking.id,
            transactionType: 'REFUND_COMMISSION_CS',
            status: 'DRAFT',
            createdBy: booking.createdById,
            updatedAt: new Date()
          }
        });
        await this.postJournalEntry(entry.id);
        console.log(`✅ Created refund CS commission entry: ${entryNumber}`);
      }

      console.log(`✅ All refund journal entries created for ${booking.bookingNumber}`);
    } catch (error: any) {
      console.error('❌ Error creating refund journal entries:', error.message);
      throw error;
    }
  }
}

export const accountingService = new AccountingService();
