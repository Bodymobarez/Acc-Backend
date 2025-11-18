import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';

const cashRegisters = new Hono();
cashRegisters.use('*', authenticate);

// GET / - Get all cash registers
cashRegisters.get('/', async (c: Context) => {
  try {
    const currency = c.req.query('currency');
    const isActive = c.req.query('isActive');
    
    const where: any = {};
    if (currency) where.currency = currency;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const registers = await prisma.cash_registers.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    return c.json({ success: true, data: registers });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /:id - Get cash register by ID
cashRegisters.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const register = await prisma.cash_registers.findUnique({
      where: { id }
    });
    
    if (!register) {
      return c.json({ success: false, error: 'Cash register not found' }, 404);
    }
    
    return c.json({ success: true, data: register });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST / - Create cash register
cashRegisters.post('/', async (c: Context) => {
  try {
    const body = await c.req.json();
    
    const register = await prisma.cash_registers.create({
      data: {
        id: randomUUID(),
        name: body.name,
        location: body.location || null,
        currency: body.currency || 'AED',
        balance: body.balance || 0,
        notes: body.notes || null,
        isActive: body.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return c.json({ success: true, data: register });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /:id - Update cash register
cashRegisters.put('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const register = await prisma.cash_registers.update({
      where: { id },
      data: {
        name: body.name,
        location: body.location,
        currency: body.currency,
        balance: body.balance,
        notes: body.notes,
        isActive: body.isActive,
        updatedAt: new Date()
      }
    });
    
    return c.json({ success: true, data: register });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /:id/balance - Update balance
cashRegisters.put('/:id/balance', async (c: Context) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { amount, operation } = body;
    
    const register = await prisma.cash_registers.findUnique({
      where: { id }
    });
    
    if (!register) {
      return c.json({ success: false, error: 'Cash register not found' }, 404);
    }
    
    const newBalance = operation === 'add' 
      ? register.balance + amount 
      : register.balance - amount;
    
    const updated = await prisma.cash_registers.update({
      where: { id },
      data: { 
        balance: newBalance,
        updatedAt: new Date()
      }
    });
    
    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /:id - Delete cash register
cashRegisters.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    await prisma.cash_registers.delete({
      where: { id }
    });
    
    return c.json({ success: true, message: 'Cash register deleted' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default cashRegisters;
