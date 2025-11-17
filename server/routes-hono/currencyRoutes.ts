import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { currencyController } from '../controllers/currencyController';

// Initialize router
const currencies = new Hono();

// All routes require authentication
currencies.use('*', authenticate);

// Helper to create fake Express response for controller compatibility
function makeFakeRes(c: any) {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
}

/**
 * GET /active - Get active currencies (MUST be before /:code)
 */
currencies.get('/active', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.getActive(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * POST /update-rates - Update all currency rates from API
 */
currencies.post('/update-rates', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.updateRates(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * POST /convert - Convert amount between currencies
 */
currencies.post('/convert', async (c: Context) => {
  try {
    const data = await c.req.json();
    const fakeReq: any = { body: data, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.convert(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * POST /initialize - Initialize default currencies
 */
currencies.post('/initialize', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.initialize(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * GET / - Get all currencies
 */
currencies.get('/', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.getAll(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * GET /:code - Get currency by code
 */
currencies.get('/:code', async (c: Context) => {
  try {
    const code = c.req.param('code');
    const fakeReq: any = { params: { code }, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.getByCode(fakeReq, fakeRes);
    return c.json(result() || { success: false }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * PUT /:code/rate - Update specific currency rate manually
 */
currencies.put('/:code/rate', async (c: Context) => {
  try {
    const code = c.req.param('code');
    const data = await c.req.json();
    const fakeReq: any = { params: { code }, body: data, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.updateManualRate(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * PUT /:code/toggle - Toggle currency active status
 */
currencies.put('/:code/toggle', async (c: Context) => {
  try {
    const code = c.req.param('code');
    const fakeReq: any = { params: { code }, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await currencyController.toggleStatus(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default currencies;
