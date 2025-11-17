import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const commissions = new Hono();
commissions.use('*', authenticate);

commissions.get('/', async (c) => {
  try {
    const list = await prisma.employee_commissions.findMany({
      include: { employees: { include: { users: true } }, bookings: true }
    });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

commissions.get('/:id', async (c) => {
  try {
    const commission = await prisma.employee_commissions.findUnique({
      where: { id: c.req.param('id') },
      include: { employees: { include: { users: true } }, bookings: true }
    });
    if (!commission) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: commission });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default commissions;
