import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const employees = new Hono();
employees.use('*', authenticate);

employees.get('/', async (c) => {
  try {
    const list = await prisma.employees.findMany({
      where: { isActive: true },
      include: {
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

employees.get('/:id', async (c) => {
  try {
    const employee = await prisma.employees.findUnique({
      where: { id: c.req.param('id') },
      include: { users: true }
    });
    if (!employee) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: employee });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

employees.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const employee = await prisma.employees.create({ data });
    return c.json({ success: true, data: employee }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

employees.put('/:id', async (c) => {
  try {
    const data = await c.req.json();
    const employee = await prisma.employees.update({
      where: { id: c.req.param('id') },
      data
    });
    return c.json({ success: true, data: employee });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

employees.delete('/:id', async (c) => {
  try {
    await prisma.employees.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default employees;
