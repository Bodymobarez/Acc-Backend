import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { receiptService } from '../services/receiptService';

const receipts = new Hono();
receipts.use('*', authenticate);

receipts.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const receipt = await receiptService.createReceipt({
      ...data,
      createdById: c.get('user')?.id
    });
    return c.json({ success: true, data: receipt, message: 'Receipt created successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

receipts.get('/', async (c) => {
  try {
    const filters = {
      status: c.req.query('status'),
      customerId: c.req.query('customerId'),
      paymentMethod: c.req.query('paymentMethod'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate')
    };
    const list = await receiptService.getAllReceipts(filters);
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

receipts.get('/:id', async (c) => {
  try {
    const receipt = await receiptService.getReceiptById(c.req.param('id'));
    if (!receipt) return c.json({ success: false, error: 'Receipt not found' }, 404);
    return c.json({ success: true, data: receipt });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

receipts.put('/:id', async (c) => {
  try {
    const data = await c.req.json();
    const receipt = await receiptService.updateReceipt(c.req.param('id'), data);
    return c.json({ success: true, data: receipt });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

receipts.delete('/:id', async (c) => {
  try {
    await receiptService.deleteReceipt(c.req.param('id'));
    return c.json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default receipts;
