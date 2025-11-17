import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { settingsController } from '../controllers/settingsController';

const settings = new Hono();

// Helper
const makeFakeRes = (c: any) => {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
};

settings.use('*', authenticate);

// Company Settings
settings.get('/company', async (c) => {
  const fakeReq: any = { user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.getCompanySettings(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.put('/company/:id', async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.updateCompanySettings(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

// System Settings
settings.get('/system', async (c) => {
  const fakeReq: any = { user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.getAllSystemSettings(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.get('/system/:key', async (c) => {
  const fakeReq: any = { params: { key: c.req.param('key') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.getSystemSetting(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.post('/system', async (c) => {
  const fakeReq: any = { body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.upsertSystemSetting(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.put('/system/:key', async (c) => {
  const fakeReq: any = { params: { key: c.req.param('key') }, body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.upsertSystemSetting(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.delete('/system/:key', async (c) => {
  const fakeReq: any = { params: { key: c.req.param('key') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.deleteSystemSetting(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

// Print Settings
settings.get('/print', async (c) => {
  const fakeReq: any = { user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.getPrintSettings(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

settings.put('/print', async (c) => {
  const fakeReq: any = { body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await settingsController.updatePrintSettings(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

export default settings;
