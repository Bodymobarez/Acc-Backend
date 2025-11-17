import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { accountController } from '../controllers/accountController';

const accounts = new Hono();
accounts.use('*', authenticate);

accounts.get('/', async (c) => {
  const fakeReq: any = { user: c.get('user') };
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  await accountController.getAll(fakeReq, fakeRes);
  return c.json(result || { success: true, data: [] }, fakeRes.statusCode || 200);
});

accounts.get('/:id', async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  await accountController.getById(fakeReq, fakeRes);
  return c.json(result || { success: false }, fakeRes.statusCode || 404);
});

accounts.post('/', async (c) => {
  const fakeReq: any = { body: await c.req.json(), user: c.get('user') };
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  await accountController.create(fakeReq, fakeRes);
  return c.json(result || { success: true }, fakeRes.statusCode || 201);
});

accounts.put('/:id', async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, body: await c.req.json(), user: c.get('user') };
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  await accountController.update(fakeReq, fakeRes);
  return c.json(result || { success: true }, fakeRes.statusCode || 200);
});

accounts.delete('/:id', async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  await accountController.delete(fakeReq, fakeRes);
  return c.json(result || { success: true }, fakeRes.statusCode || 200);
});

export default accounts;
