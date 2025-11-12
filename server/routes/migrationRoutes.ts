import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { accountingService } from '../services/accountingService';

const router = Router();

/**
 * POST /api/migration/create-booking-journal-entries
 * Create journal entries for existing bookings that don't have them
 */
router.post('/create-booking-journal-entries', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting migration: Creating journal entries for existing bookings...');
    
    // Get all bookings with their relations
    const bookings = await prisma.bookings.findMany({
      include: {
        suppliers: true,
        customers: true,
        users: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📦 Found ${bookings.length} total bookings`);
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const booking of bookings) {
      try {
        // Check if journal entries already exist for this booking
        const existingEntries = await prisma.journal_entries.findFirst({
          where: { bookingId: booking.id }
        });
        
        if (existingEntries) {
          console.log(`⏭️  Skipping booking ${booking.bookingNumber} - already has journal entries`);
          skippedCount++;
          continue;
        }
        
        // Create journal entries for this booking
        console.log(`✨ Creating journal entries for booking ${booking.bookingNumber}...`);
        
        await accountingService.createBookingJournalEntry(booking);
        
        // Create commission entries if applicable
        if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'AGENT');
        }
        
        if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'CS');
        }
        
        successCount++;
        console.log(`✅ Created journal entries for booking ${booking.bookingNumber}`);
        
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error creating journal entries for booking ${booking.bookingNumber}:`, error.message);
      }
    }
    
    const summary = {
      total: bookings.length,
      success: successCount,
      skipped: skippedCount,
      errors: errorCount
    };
    
    console.log('📊 Migration Summary:', summary);
    
    res.json({
      success: true,
      message: 'Migration completed',
      summary
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

/**
 * POST /api/migration/recalculate-account-balances
 * Recalculate all account balances from journal entries
 */
router.post('/recalculate-account-balances', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting migration: Recalculating account balances...');
    
    // Get all accounts
    const accounts = await prisma.accounts.findMany();
    
    console.log(`📦 Found ${accounts.length} accounts`);
    
    let updatedCount = 0;
    
    for (const account of accounts) {
      try {
        // Get all journal entries for this account
        const debitEntries = await prisma.journal_entries.findMany({
          where: { debitAccountId: account.id }
        });
        
        const creditEntries = await prisma.journal_entries.findMany({
          where: { creditAccountId: account.id }
        });
        
        // Calculate total debits and credits
        const totalDebits = debitEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
        const totalCredits = creditEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
        
        // Calculate balance based on account type
        let balance = 0;
        if (account.type === 'ASSET' || account.type === 'EXPENSE') {
          balance = totalDebits - totalCredits;
        } else {
          balance = totalCredits - totalDebits;
        }
        
        // Update account balance
        await prisma.accounts.update({
          where: { id: account.id },
          data: { 
            balance: balance,
            updatedAt: new Date()
          }
        });
        
        updatedCount++;
        console.log(`✅ Updated balance for ${account.name} (${account.code}): AED ${balance.toFixed(2)}`);
        
      } catch (error: any) {
        console.error(`❌ Error updating account ${account.name}:`, error.message);
      }
    }
    
    console.log(`📊 Updated ${updatedCount} account balances`);
    
    res.json({
      success: true,
      message: 'Account balances recalculated',
      updatedCount
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

export default router;
