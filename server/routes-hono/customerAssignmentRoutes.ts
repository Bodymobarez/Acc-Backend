import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const customerAssignments = new Hono();
customerAssignments.use('*', authenticate);

customerAssignments.get('/', async (c) => {
  try {
    const list = await prisma.customer_assignments.findMany({
      where: { isActive: true },
      include: { customers: true, users: true }
    });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

customerAssignments.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const assignment = await prisma.customer_assignments.create({ data });
    return c.json({ success: true, data: assignment }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default customerAssignments;
