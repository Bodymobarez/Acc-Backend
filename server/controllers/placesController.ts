import { Request, Response } from 'express';

const GOOGLE_PLACES_API_KEY = 'AIzaSyD04KGBh4IgQmcItL6cXjG0gEuGtJgAf3Y';
const TRIPADVISOR_API_KEY = '7DA5E18292C4473B9EDE718BC53D5357';

// Country code mapping for phone number formatting
const COUNTRY_CODES: { [key: string]: string } = {
  'Egypt': '+20',
  'United Arab Emirates': '+971',
  'Saudi Arabia': '+966',
  'Kuwait': '+965',
  'Bahrain': '+973',
  'Oman': '+968',
  'Qatar': '+974',
  'Jordan': '+962',
  'Lebanon': '+961',
  'Morocco': '+212',
  'Tunisia': '+216',
  'Algeria': '+213',
  'Libya': '+218',
  'Sudan': '+249',
  'Iraq': '+964',
  'Syria': '+963',
  'Palestine': '+970',
  'Yemen': '+967'
};

/**
 * Format phone number with country code
 */
function formatPhoneWithCountryCode(phone: string, country: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return phone;
  
  // If already has country code (starts with +), return as is
  if (phone.startsWith('+')) return phone;
  
  // Get country code from mapping
  const countryCode = COUNTRY_CODES[country];
  if (!countryCode) return phone; // Return original if country not found
  
  // Remove leading zero if present (common in local numbers)
  const numberWithoutLeadingZero = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
  
  // Format: +CountryCode Number
  return `${countryCode} ${numberWithoutLeadingZero}`;
}

/**
 * Search for hotels in a city using TripAdvisor API
 */
export const searchHotelsByCity = async (req: Request, res: Response) => {
  try {
    const { city, country } = req.body;

    if (!city) {
      return res.status(400).json({
        error: 'City is required'
      });
    }

    const query = country ? `hotels in ${city}, ${country}` : `hotels in ${city}`;
    console.log(`🔍 [TripAdvisor] Searching for hotels in: ${query}`);

    // Search for hotels in the city
    const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${TRIPADVISOR_API_KEY}&searchQuery=${encodeURIComponent(query)}&category=hotels&language=en`;
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ TripAdvisor Search API error:', searchResponse.status, errorText);
      return res.status(searchResponse.status).json({
        error: 'Failed to search hotels on TripAdvisor',
        details: errorText
      });
    }

    const searchData = await searchResponse.json();
    console.log(`✅ TripAdvisor found ${searchData.data?.length || 0} hotels`);

    if (!searchData.data || searchData.data.length === 0) {
      return res.json({
        success: true,
        source: 'TripAdvisor',
        data: []
      });
    }

    // Extract hotel list (limit to first 50 results)
    const hotels = searchData.data.slice(0, 50).map((location: any) => ({
      id: `tripadvisor-${location.location_id}`,
      name: location.name,
      address: location.address_obj ? [
        location.address_obj.street1,
        location.address_obj.city,
        location.address_obj.country
      ].filter(Boolean).join(', ') : '',
      rating: location.rating ? Math.round(parseFloat(location.rating)) : 3,
      source: 'tripadvisor',
      externalId: location.location_id
    }));

    console.log(`📋 Returning ${hotels.length} hotels from TripAdvisor`);

    res.json({
      success: true,
      source: 'TripAdvisor',
      data: hotels
    });

  } catch (error: any) {
    console.error('❌ Error in searchHotelsByCity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Search for hotel details using TripAdvisor API
 */
export const searchHotelDetailsTripAdvisor = async (req: Request, res: Response) => {
  try {
    const { hotelName, city } = req.body;

    if (!hotelName || !city) {
      return res.status(400).json({
        error: 'Hotel name and city are required'
      });
    }

    const query = `${hotelName} ${city}`;
    console.log(`🔍 [TripAdvisor] Searching for hotel: ${query}`);

    // Step 1: Search for location
    const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${TRIPADVISOR_API_KEY}&searchQuery=${encodeURIComponent(query)}&category=hotels&language=en`;
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ TripAdvisor Search API error:', searchResponse.status, errorText);
      return res.status(searchResponse.status).json({
        error: 'Failed to search hotel on TripAdvisor',
        details: errorText
      });
    }

    const searchData = await searchResponse.json();
    console.log('✅ TripAdvisor search response:', JSON.stringify(searchData, null, 2));

    if (!searchData.data || searchData.data.length === 0) {
      return res.status(404).json({
        error: 'Hotel not found on TripAdvisor',
        message: 'No matching hotels found for the given name and city'
      });
    }

    const locationId = searchData.data[0].location_id;
    console.log(`📍 Found location ID: ${locationId}`);

    // Step 2: Get location details
    const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${TRIPADVISOR_API_KEY}&language=en&currency=USD`;
    
    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('❌ TripAdvisor Details API error:', detailsResponse.status, errorText);
      return res.status(detailsResponse.status).json({
        error: 'Failed to get hotel details from TripAdvisor',
        details: errorText
      });
    }

    const detailsData = await detailsResponse.json();
    console.log('✅ TripAdvisor details response:', JSON.stringify(detailsData, null, 2));

    // Extract hotel details
    const location = detailsData;
    const address = location.address_obj || {};
    const country = address.country || '';
    const rawPhone = location.phone || address.phone || '';
    
    console.log('📍 Address Object:', JSON.stringify(address, null, 2));
    console.log('🏛️ City from address:', address.city);
    
    const hotelDetails = {
      name: location.name || hotelName,
      city: address.city || '',
      address: [
        address.street1,
        address.street2,
        address.city,
        address.state,
        address.country
      ].filter(Boolean).join(', '),
      phone: formatPhoneWithCountryCode(rawPhone, country),
      email: location.email || location.website ? `info@${new URL(location.website).hostname.replace('www.', '')}` : '',
      rating: location.rating ? Math.round(parseFloat(location.rating)) : null,
      website: location.website || '',
      description: location.description || ''
    };

    console.log('📋 Extracted TripAdvisor hotel details:', hotelDetails);

    res.json({
      success: true,
      source: 'TripAdvisor',
      data: hotelDetails
    });

  } catch (error: any) {
    console.error('❌ Error in searchHotelDetailsTripAdvisor:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Search for hotel details using Google Places API
 */
export const searchHotelDetails = async (req: Request, res: Response) => {
  try {
    const { hotelName, city } = req.body;

    if (!hotelName || !city) {
      return res.status(400).json({
        error: 'Hotel name and city are required'
      });
    }

    const query = `${hotelName} ${city}`;
    console.log(`🔍 Searching for hotel: ${query}`);

    // Use Google Places Text Search API
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Places API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch hotel details from Google Places',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Google Places response:', JSON.stringify(data, null, 2));

    if (!data.places || data.places.length === 0) {
      return res.status(404).json({
        error: 'Hotel not found',
        message: 'No matching hotels found for the given name and city'
      });
    }

    const place = data.places[0];

    // Extract email from website if available
    let hotelEmail = '';
    if (place.websiteUri) {
      try {
        const url = new URL(place.websiteUri);
        const domain = url.hostname.replace('www.', '');
        hotelEmail = `reservations@${domain}`;
      } catch (e) {
        console.log('Could not parse website URL for email extraction');
      }
    }

    // Return formatted hotel details
    const hotelDetails = {
      name: place.displayName?.text || hotelName,
      address: place.formattedAddress || '',
      phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
      email: hotelEmail,
      rating: place.rating ? Math.round(place.rating) : null,
      website: place.websiteUri || ''
    };

    console.log('📋 Extracted hotel details:', hotelDetails);

    res.json({
      success: true,
      data: hotelDetails
    });

  } catch (error: any) {
    console.error('❌ Error in searchHotelDetails:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Search for hotels in a city with query filter (for autocomplete)
 */
export const searchHotelsWithQuery = async (req: Request, res: Response) => {
  try {
    const { city, query } = req.body;

    if (!city || !query) {
      return res.status(400).json({
        error: 'City and query are required'
      });
    }

    console.log(`🔍 [TripAdvisor Autocomplete] Searching: "${query}" in ${city}`);

    // Try multiple search variations to get more results
    const searchVariations = [
      `${query} hotels in ${city}`,
      `${query} hotel ${city}`,
      `hotels ${query} ${city}`
    ];

    const allHotels = new Map<string, any>(); // Use Map to avoid duplicates

    for (const searchQuery of searchVariations) {
      try {
        const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${TRIPADVISOR_API_KEY}&searchQuery=${encodeURIComponent(searchQuery)}&category=hotels&language=en`;
        
        const searchResponse = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          if (searchData.data && Array.isArray(searchData.data)) {
            searchData.data.forEach((location: any) => {
              // Use location_id as unique key to avoid duplicates
              if (!allHotels.has(location.location_id)) {
                allHotels.set(location.location_id, location);
              }
            });
          }
        }
      } catch (error) {
        console.log(`⚠️  Search variation failed: ${searchQuery}`);
      }

      // Stop if we have enough results
      if (allHotels.size >= 30) break;
    }

    console.log(`✅ Found ${allHotels.size} unique hotels`);

    if (allHotels.size === 0) {
      return res.json({
        success: true,
        source: 'TripAdvisor',
        data: []
      });
    }

    // Extract hotel list with full details
    const hotels = Array.from(allHotels.values()).slice(0, 30).map((location: any) => {
      const addressObj = location.address_obj || {};
      const addressParts = [
        addressObj.street1,
        addressObj.street2,
        addressObj.city,
        addressObj.state,
        addressObj.country
      ].filter(Boolean);

      return {
        id: `tripadvisor-${location.location_id}`,
        name: location.name,
        address: addressParts.length > 0 ? addressParts.join(', ') : addressObj.address_string || '',
        city: addressObj.city || city,
        country: addressObj.country || '',
        rating: location.rating || null,
        phone: addressObj.phone || '',
        email: addressObj.email || ''
      };
    });

    res.json({
      success: true,
      source: 'TripAdvisor',
      data: hotels
    });

  } catch (error: any) {
    console.error('❌ Error in searchHotelsWithQuery:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
