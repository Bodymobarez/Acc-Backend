import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/reports/general-ledger
 * Generate General Ledger Report with currency conversion
 * Shows all journal entries grouped by account with running balances
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountId, currency = 'AED' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get exchange rate for selected currency
    let exchangeRate = 1;
    if (currency !== 'AED') {
      const currencyData = await prisma.currencies.findUnique({
        where: { code: currency as string }
      });
      exchangeRate = currencyData?.exchangeRateToAED || 1;
    }

    // Build where clause
    const where: any = {
      date: {
        gte: start,
        lte: end
      },
      status: 'POSTED' // Only include posted entries
    };

    // Filter by specific account if provided
    if (accountId) {
      where.OR = [
        { debitAccountId: accountId as string },
        { creditAccountId: accountId as string }
      ];
    }

    // Get journal entries
    const entries = await prisma.journal_entries.findMany({
      where,
      include: {
        accounts_journal_entries_debitAccountIdToaccounts: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true
          }
        },
        accounts_journal_entries_creditAccountIdToaccounts: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { entryNumber: 'asc' }
      ]
    });

    // Get all unique accounts from the entries
    const accountIds = new Set<string>();
    entries.forEach(entry => {
      if (entry.debitAccountId) accountIds.add(entry.debitAccountId);
      if (entry.creditAccountId) accountIds.add(entry.creditAccountId);
    });

    // Get account details for all accounts
    const accounts = await prisma.accounts.findMany({
      where: {
        id: {
          in: Array.from(accountIds)
        }
      },
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    // Get opening balances for each account (entries before start date)
    const openingBalances = new Map<string, { debit: number; credit: number }>();
    
    for (const accountData of accounts) {
      const previousEntries = await prisma.journal_entries.findMany({
        where: {
          date: {
            lt: start
          },
          status: 'POSTED',
          OR: [
            { debitAccountId: accountData.id },
            { creditAccountId: accountData.id }
          ]
        },
        select: {
          debitAccountId: true,
          creditAccountId: true,
          amount: true
        }
      });

      let totalDebit = 0;
      let totalCredit = 0;

      previousEntries.forEach(entry => {
        if (entry.debitAccountId === accountData.id) {
          totalDebit += Number(entry.amount);
        }
        if (entry.creditAccountId === accountData.id) {
          totalCredit += Number(entry.amount);
        }
      });

      openingBalances.set(accountData.id, {
        debit: totalDebit,
        credit: totalCredit
      });
    }

    // Group entries by account
    const accountLedgers = accounts.map(account => {
      const accountEntries = entries
        .filter(entry => 
          entry.debitAccountId === account.id || 
          entry.creditAccountId === account.id
        )
        .map(entry => {
          const isDebit = entry.debitAccountId === account.id;
          const amount = Number(entry.amount);
          const convertedAmount = amount / exchangeRate;

          return {
            entryId: entry.id,
            entryNumber: entry.entryNumber,
            date: entry.date,
            description: entry.description,
            reference: entry.reference,
            debit: isDebit ? convertedAmount : 0,
            credit: !isDebit ? convertedAmount : 0,
            debitAccountCode: entry.accounts_journal_entries_debitAccountIdToaccounts?.code,
            debitAccountName: entry.accounts_journal_entries_debitAccountIdToaccounts?.name,
            debitAccountNameAr: entry.accounts_journal_entries_debitAccountIdToaccounts?.nameAr,
            creditAccountCode: entry.accounts_journal_entries_creditAccountIdToaccounts?.code,
            creditAccountName: entry.accounts_journal_entries_creditAccountIdToaccounts?.name,
            creditAccountNameAr: entry.accounts_journal_entries_creditAccountIdToaccounts?.nameAr,
            transactionType: entry.transactionType
          };
        });

      // Calculate opening balance
      const opening = openingBalances.get(account.id) || { debit: 0, credit: 0 };
      const openingBalance = (opening.debit - opening.credit) / exchangeRate;

      // Calculate running balance
      let runningBalance = openingBalance;
      const entriesWithBalance = accountEntries.map(entry => {
        if (account.type === 'ASSET' || account.type === 'EXPENSE') {
          runningBalance += entry.debit - entry.credit;
        } else {
          runningBalance += entry.credit - entry.debit;
        }
        return {
          ...entry,
          balance: runningBalance
        };
      });

      // Calculate totals
      const totalDebit = accountEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = accountEntries.reduce((sum, e) => sum + e.credit, 0);
      const closingBalance = openingBalance + (totalDebit - totalCredit);

      return {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          nameAr: account.nameAr,
          type: account.type
        },
        openingBalance,
        entries: entriesWithBalance,
        totals: {
          debit: totalDebit,
          credit: totalCredit
        },
        closingBalance,
        entryCount: accountEntries.length
      };
    }).filter(ledger => ledger.entryCount > 0); // Only include accounts with entries

    // Calculate grand totals
    const grandTotals = {
      totalDebit: accountLedgers.reduce((sum, l) => sum + l.totals.debit, 0),
      totalCredit: accountLedgers.reduce((sum, l) => sum + l.totals.credit, 0),
      accountCount: accountLedgers.length,
      entryCount: entries.length
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: start,
          endDate: end
        },
        currency: currency as string,
        exchangeRate,
        ledgers: accountLedgers,
        grandTotals
      }
    });
  } catch (error) {
    console.error('Error generating general ledger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate general ledger report'
    });
  }
});

/**
 * GET /api/reports/general-ledger/accounts
 * Get list of accounts for filtering
 */
router.get('/accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.accounts.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts'
    });
  }
});

export default router;
