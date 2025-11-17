import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { accountingService } from '../services/accountingService';

const router = Router();

interface Stats {
  bookingsProcessed: number;
  bookingsSkipped: number;
  bookingsSuccess: number;
  bookingsFailed: number;
  invoicesProcessed: number;
  invoicesSkipped: number;
  invoicesSuccess: number;
  invoicesFailed: number;
  receiptsProcessed: number;
  receiptsSkipped: number;
  receiptsSuccess: number;
  receiptsFailed: number;
  commissionsCreated: number;
  errors: string[];
}

/**
 * POST /api/accounting/generate-all-entries
 * Generate journal entries for all existing bookings, invoices, and receipts
 */
router.post('/generate-all-entries', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚀 Starting generation of all journal entries...');
    
    const stats: Stats = {
      bookingsProcessed: 0,
      bookingsSkipped: 0,
      bookingsSuccess: 0,
      bookingsFailed: 0,
      invoicesProcessed: 0,
      invoicesSkipped: 0,
      invoicesSuccess: 0,
      invoicesFailed: 0,
      receiptsProcessed: 0,
      receiptsSkipped: 0,
      receiptsSuccess: 0,
      receiptsFailed: 0,
      commissionsCreated: 0,
      errors: []
    };

    // 1. Process Bookings
    console.log('📦 Processing bookings...');
    const bookings = await prisma.bookings.findMany({
      include: {
        suppliers: true,
        customers: true,
        users: true,
        booking_suppliers: {
          include: {
            suppliers: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    for (const booking of bookings) {
      stats.bookingsProcessed++;
      
      try {
        // Check if already has entries
        const existingEntry = await prisma.journal_entries.findFirst({
          where: { 
            bookingId: booking.id,
            transactionType: 'BOOKING_COST'
          }
        });

        if (existingEntry) {
          stats.bookingsSkipped++;
          continue;
        }

        // Create booking entry
        await accountingService.createBookingJournalEntry(booking);
        stats.bookingsSuccess++;

        // Create commission entries
        if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'AGENT');
          stats.commissionsCreated++;
        }

        if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'CS');
          stats.commissionsCreated++;
        }

      } catch (error: any) {
        stats.bookingsFailed++;
        stats.errors.push(`Booking ${booking.bookingNumber}: ${error.message}`);
      }
    }

    // 2. Process Invoices
    console.log('📄 Processing invoices...');
    const invoices = await prisma.invoices.findMany({
      include: {
        customers: true,
        bookings: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    for (const invoice of invoices) {
      stats.invoicesProcessed++;
      
      try {
        // Check if already has entries
        const existingEntry = await prisma.journal_entries.findFirst({
          where: { 
            invoiceId: invoice.id,
            transactionType: 'INVOICE_REVENUE'
          }
        });

        if (existingEntry) {
          stats.invoicesSkipped++;
          continue;
        }

        // Create invoice entry
        await accountingService.createInvoiceJournalEntry(invoice);
        stats.invoicesSuccess++;

      } catch (error: any) {
        stats.invoicesFailed++;
        stats.errors.push(`Invoice ${invoice.invoiceNumber}: ${error.message}`);
      }
    }

    // 3. Process Receipts
    console.log('💰 Processing receipts...');
    const receipts = await prisma.receipts.findMany({
      include: {
        customers: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    for (const receipt of receipts) {
      stats.receiptsProcessed++;
      
      try {
        // Check if already has entries
        const existingEntry = await prisma.journal_entries.findFirst({
          where: { 
            reference: receipt.receiptNumber,
            transactionType: 'RECEIPT_PAYMENT'
          }
        });

        if (existingEntry) {
          stats.receiptsSkipped++;
          continue;
        }

        // Create receipt entry
        await accountingService.createReceiptJournalEntry(receipt);
        stats.receiptsSuccess++;

      } catch (error: any) {
        stats.receiptsFailed++;
        stats.errors.push(`Receipt ${receipt.receiptNumber}: ${error.message}`);
      }
    }

    // Get final counts
    const totalEntries = await prisma.journal_entries.count();
    const postedEntries = await prisma.journal_entries.count({
      where: { status: 'POSTED' }
    });

    // Get key account balances
    const keyAccounts = await prisma.accounts.findMany({
      where: {
        code: {
          in: ['1111', '1114', '1121', '2111', '2121', '2132', '5110', '6120']
        }
      },
      select: {
        code: true,
        name: true,
        balance: true,
        debitBalance: true,
        creditBalance: true
      }
    });

    console.log('✅ Journal entry generation complete');

    res.json({
      success: true,
      message: 'Journal entries generated successfully',
      data: {
        stats,
        journalEntries: {
          total: totalEntries,
          posted: postedEntries,
          draft: totalEntries - postedEntries
        },
        accountBalances: keyAccounts.map(acc => ({
          code: acc.code,
          name: acc.name,
          balance: acc.balance,
          debitBalance: acc.debitBalance,
          creditBalance: acc.creditBalance
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Error generating journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate journal entries',
      details: error.message
    });
  }
});

/**
 * GET /api/accounting/journal-entries-summary
 * Get summary of journal entries
 */
router.get('/journal-entries-summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const total = await prisma.journal_entries.count();
    const posted = await prisma.journal_entries.count({
      where: { status: 'POSTED' }
    });

    const byType = await prisma.journal_entries.groupBy({
      by: ['transactionType'],
      _count: true
    });

    const recent = await prisma.journal_entries.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        accounts_journal_entries_debitAccountIdToaccounts: {
          select: { code: true, name: true }
        },
        accounts_journal_entries_creditAccountIdToaccounts: {
          select: { code: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        total,
        posted,
        draft: total - posted,
        byType: byType.map(t => ({
          type: t.transactionType,
          count: t._count
        })),
        recent: recent.map(e => ({
          entryNumber: e.entryNumber,
          date: e.date,
          description: e.description,
          amount: e.amount,
          debitAccount: e.accounts_journal_entries_debitAccountIdToaccounts?.code,
          creditAccount: e.accounts_journal_entries_creditAccountIdToaccounts?.code,
          status: e.status,
          transactionType: e.transactionType
        }))
      }
    });

  } catch (error: any) {
    console.error('Error getting journal entries summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summary'
    });
  }
});

export default router;
