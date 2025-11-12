import { Request, Response } from 'express';
import { locationService } from '../services/locationService';

export const getAllCountries = async (req: Request, res: Response) => {
  try {
    const countries = await locationService.getAllCountries();
    res.json({ success: true, data: countries });
  } catch (error: any) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCitiesByCountry = async (req: Request, res: Response) => {
  try {
    const { countryId } = req.params;
    const cities = await locationService.getCitiesByCountry(countryId);
    res.json({ success: true, data: cities });
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHotelsByCity = async (req: Request, res: Response) => {
  try {
    const { cityId } = req.params;
    const hotels = await locationService.getHotelsByCity(cityId);
    res.json({ success: true, data: hotels });
  } catch (error: any) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createHotel = async (req: Request, res: Response) => {
  try {
    const { name, cityId, address, phone, email, rating } = req.body;
    
    if (!name || !cityId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Hotel name and city are required' 
      });
    }

    const hotel = await locationService.upsertHotel(
      name,
      cityId,
      address,
      phone,
      email,
      rating
    );

    res.json({ success: true, data: hotel });
  } catch (error: any) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const initializeLocations = async (req: Request, res: Response) => {
  try {
    await locationService.initializeLocations();
    res.json({ success: true, message: 'Locations initialized successfully' });
  } catch (error: any) {
    console.error('Error initializing locations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
