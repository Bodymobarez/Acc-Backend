import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const assignments = new Hono();
assignments.use('*', authenticate);

assignments.get('/', async (c) => {
  try {
    const list = await prisma.customer_assignments.findMany({
      where: { isActive: true },
      include: {
        customers: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

assignments.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const assignment = await prisma.customer_assignments.create({ data });
    return c.json({ success: true, data: assignment }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

assignments.delete('/:id', async (c) => {
  try {
    await prisma.customer_assignments.update({
      where: { id: c.req.param('id') },
      data: { isActive: false }
    });
    return c.json({ success: true, message: 'Assignment removed' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default assignments;
