import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';

const migration = new Hono();
migration.use('*', authenticate);

migration.post('/run', async (c) => {
  return c.json({ success: true, message: 'Migration endpoint - use carefully' });
});

export default migration;
