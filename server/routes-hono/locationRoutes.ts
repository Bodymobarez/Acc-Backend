import { Hono } from 'hono';
import type { Context } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import {
  getAllCountries,
  getCitiesByCountry,
  getHotelsByCity,
  createHotel,
  initializeLocations
} from '../controllers/locationController';

// Initialize router
const locations = new Hono();

// Helper
const makeFakeRes = (c: any) => {
  let result: any;
  const fakeRes: any = {
    json: (data: any) => { result = data; return fakeRes; },
    status: (code: number) => { fakeRes.statusCode = code; return fakeRes; }
  };
  return { fakeRes, result: () => result, status: () => fakeRes.statusCode || 200 };
};

/**
 * GET /countries - Get all countries (public)
 */
locations.get('/countries', async (c: Context) => {
  try {
    const fakeReq: any = {};
    const { fakeRes, result, status } = makeFakeRes(c);
    await getAllCountries(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * GET /countries/:countryId/cities - Get cities by country (public)
 */
locations.get('/countries/:countryId/cities', async (c: Context) => {
  try {
    const countryId = c.req.param('countryId');
    const fakeReq: any = { params: { countryId } };
    const { fakeRes, result, status } = makeFakeRes(c);
    await getCitiesByCountry(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * GET /cities/:cityId/hotels - Get hotels by city (public)
 */
locations.get('/cities/:cityId/hotels', async (c: Context) => {
  try {
    const cityId = c.req.param('cityId');
    const fakeReq: any = { params: { cityId } };
    const { fakeRes, result, status } = makeFakeRes(c);
    await getHotelsByCity(fakeReq, fakeRes);
    return c.json(result() || { success: true, data: [] }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Protected routes (require authentication)
locations.use('/hotels', authenticate);
locations.use('/initialize', authenticate);

/**
 * POST /hotels - Create new hotel (protected)
 */
locations.post('/hotels', async (c: Context) => {
  try {
    const data = await c.req.json();
    const fakeReq: any = { body: data, user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await createHotel(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

/**
 * POST /initialize - Initialize default locations (protected)
 */
locations.post('/initialize', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    const { fakeRes, result, status } = makeFakeRes(c);
    await initializeLocations(fakeReq, fakeRes);
    return c.json(result() || { success: true }, status());
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default locations;
