import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const bankAccounts = new Hono();
bankAccounts.use('*', authenticate);

bankAccounts.get('/', async (c) => {
  try {
    const list = await prisma.bank_accounts.findMany({ orderBy: { accountName: 'asc' } });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

bankAccounts.get('/:id', async (c) => {
  try {
    const account = await prisma.bank_accounts.findUnique({ where: { id: c.req.param('id') } });
    if (!account) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: account });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

bankAccounts.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const account = await prisma.bank_accounts.create({ data });
    return c.json({ success: true, data: account }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

bankAccounts.put('/:id', async (c) => {
  try {
    const data = await c.req.json();
    const account = await prisma.bank_accounts.update({ where: { id: c.req.param('id') }, data });
    return c.json({ success: true, data: account });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

bankAccounts.delete('/:id', async (c) => {
  try {
    await prisma.bank_accounts.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default bankAccounts;
