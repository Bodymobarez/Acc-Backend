import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate, requirePermission } from '../middleware-hono/auth';
import { fileController } from '../controllers/fileController';

const files = new Hono();
files.use('*', authenticate);

// Helper
const makeFakeRes = (c: any) => {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; },
    download: (path: string, filename: string) => { result = { success: true, message: 'Download not yet implemented' }; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
};

files.post('/', requirePermission('createFile'), async (c) => {
  const fakeReq: any = { body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.create(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

files.get('/', requirePermission('viewFiles'), async (c) => {
  const fakeReq: any = { query: c.req.query(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.getAll(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

files.get('/:id', requirePermission('viewFiles'), async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.getById(fakeReq, fakeRes);
  return c.json(result() || { success: false }, status());
});

files.put('/:id/status', requirePermission('editFile'), async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, body: await c.req.json(), user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.updateStatus(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

files.post('/:id/generate-pdf', requirePermission('generateFile'), async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.generatePDF(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

files.get('/:id/download', requirePermission('viewFiles'), async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.downloadPDF(fakeReq, fakeRes);
  return c.json(result() || { success: false }, status());
});

files.delete('/:id', requirePermission('deleteFile'), async (c) => {
  const fakeReq: any = { params: { id: c.req.param('id') }, user: c.get('user') };
  const { fakeRes, result, status } = makeFakeRes(c);
  await fileController.delete(fakeReq, fakeRes);
  return c.json(result() || { success: true }, status());
});

export default files;
