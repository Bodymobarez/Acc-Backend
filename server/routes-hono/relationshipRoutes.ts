import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const relationships = new Hono();
relationships.use('*', authenticate);

relationships.get('/', async (c) => {
  try {
    const list = await prisma.customer_supplier_relationships.findMany({
      include: { customers: true, suppliers: true }
    });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

relationships.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const relationship = await prisma.customer_supplier_relationships.create({ data });
    return c.json({ success: true, data: relationship }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

relationships.delete('/:id', async (c) => {
  try {
    await prisma.customer_supplier_relationships.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default relationships;
