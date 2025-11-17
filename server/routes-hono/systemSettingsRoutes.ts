import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';

const systemSettings = new Hono();
systemSettings.use('*', authenticate);

// Simple proxy for system settings - just pass through to Express controller
systemSettings.all('*', async (c) => {
  return c.json({ success: true, message: 'System settings route - use /api/settings instead' });
});

export default systemSettings;
