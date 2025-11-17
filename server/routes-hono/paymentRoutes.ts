import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate } from '../middleware-hono/auth';
import { paymentController } from '../controllers/paymentController';

// Initialize router
const payments = new Hono();

// Helper
const makeFakeRes = (c: any) => {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
};


// All routes require authentication
payments.use('*', authenticate);

/**
 * POST / - Create payment
 */
payments.post('/', async (c: Context) => {
  try {
    const data = await c.req.json();
    
    const fakeReq: any = { body: data, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.create(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET / - Get all payments
 */
payments.get('/', async (c: Context) => {
  try {
    const query = {
      status: c.req.query('status'),
      type: c.req.query('type'),
      customerId: c.req.query('customerId'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
    };
    
    const fakeReq: any = { query, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.getAll(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET /statistics - Get payment statistics
 */
payments.get('/statistics', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.getStatistics(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET /generate-number - Generate payment number
 */
payments.get('/generate-number', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.generateNumber(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET /:id - Get payment by ID
 */
payments.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const fakeReq: any = { params: { id }, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.getById(fakeReq, fakeRes);
    return c.json(result() || { success: false }, 404, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * PUT /:id - Update payment
 */
payments.put('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    
    const fakeReq: any = { params: { id }, body: data, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.update(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * DELETE /:id - Delete payment
 */
payments.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const fakeReq: any = { params: { id }, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    
    await paymentController.delete(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

export default payments;
