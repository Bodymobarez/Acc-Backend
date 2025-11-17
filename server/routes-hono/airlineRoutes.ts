import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const airlines = new Hono();
airlines.use('*', authenticate);

airlines.get('/', async (c) => {
  try {
    const list = await prisma.airlines.findMany({ orderBy: { name: 'asc' } });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

airlines.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const airline = await prisma.airlines.create({ data });
    return c.json({ success: true, data: airline }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default airlines;
