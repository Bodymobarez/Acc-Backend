import express from 'express';
import { searchHotelDetails, searchHotelDetailsTripAdvisor, searchHotelsByCity } from '../controllers/placesController';

const router = express.Router();

// POST /api/places/search-hotel - Search for hotel details using Google Places
router.post('/search-hotel', searchHotelDetails);

// POST /api/places/search-hotel-tripadvisor - Search for hotel details using TripAdvisor
router.post('/search-hotel-tripadvisor', searchHotelDetailsTripAdvisor);

// POST /api/places/search-hotels-by-city - Search for hotels in a city using TripAdvisor
router.post('/search-hotels-by-city', searchHotelsByCity);

export default router;
