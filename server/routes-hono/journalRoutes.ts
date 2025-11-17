import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const journals = new Hono();
journals.use('*', authenticate);

journals.get('/', requirePermission('viewFinancialReports'), async (c) => {
  try {
    const { status, transactionType, startDate, endDate, debitAccountId, creditAccountId } = c.req.query();
    
    const where: any = {};
    if (status) where.status = status;
    if (transactionType) where.transactionType = transactionType;
    if (debitAccountId) where.debitAccountId = debitAccountId;
    if (creditAccountId) where.creditAccountId = creditAccountId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
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
      orderBy: { date: 'desc' }
    });
    
    return c.json({ success: true, data: entries });
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

journals.get('/:id', requirePermission('viewFinancialReports'), async (c) => {
  try {
    const entry = await prisma.journal_entries.findUnique({
      where: { id: c.req.param('id') },
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
      }
    });
    if (!entry) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Error fetching journal entry:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

journals.post('/', requirePermission('viewFinancialReports'), async (c) => {
  try {
    const data = await c.req.json();
    const entry = await prisma.journal_entries.create({ data });
    return c.json({ success: true, data: entry }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

journals.put('/:id', requirePermission('viewFinancialReports'), async (c) => {
  try {
    const data = await c.req.json();
    const entry = await prisma.journal_entries.update({
      where: { id: c.req.param('id') },
      data
    });
    return c.json({ success: true, data: entry });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

journals.delete('/:id', requirePermission('viewFinancialReports'), async (c) => {
  try {
    await prisma.journal_entries.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default journals;
