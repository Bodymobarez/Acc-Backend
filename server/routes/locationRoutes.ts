import express from 'express';
import {
  getAllCountries,
  getCitiesByCountry,
  getHotelsByCity,
  createHotel,
  initializeLocations
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET routes don't require authentication (public data)
// GET /api/locations/countries - Get all countries
router.get('/countries', getAllCountries);

// GET /api/locations/countries/:countryId/cities - Get cities by country
router.get('/countries/:countryId/cities', getCitiesByCountry);

// GET /api/locations/cities/:cityId/hotels - Get hotels by city
router.get('/cities/:cityId/hotels', getHotelsByCity);

// POST routes require authentication
router.use(authenticate);

// POST /api/locations/hotels - Create new hotel
router.post('/hotels', createHotel);

// POST /api/locations/initialize - Initialize default locations
router.post('/initialize', initializeLocations);

export default router;
