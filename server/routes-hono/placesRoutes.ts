import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const places = new Hono();
places.use('*', authenticate);

places.get('/', async (c) => {
  try {
    const list = await prisma.places.findMany({ orderBy: { name: 'asc' } });
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

places.get('/:id', async (c) => {
  try {
    const place = await prisma.places.findUnique({ where: { id: c.req.param('id') } });
    if (!place) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: place });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

places.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const place = await prisma.places.create({ data });
    return c.json({ success: true, data: place }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

places.put('/:id', async (c) => {
  try {
    const data = await c.req.json();
    const place = await prisma.places.update({ where: { id: c.req.param('id') }, data });
    return c.json({ success: true, data: place });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

places.delete('/:id', async (c) => {
  try {
    await prisma.places.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default places;
