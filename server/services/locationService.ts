import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
}

export interface Hotel {
  id: string;
  name: string;
  cityId: string;
  city?: City;
  address?: string;
  phone?: string;
  email?: string;
  rating: number;
}

// Load world data from JSON file
let worldData: any = null;
function loadWorldData() {
  if (!worldData) {
    try {
      const dataPath = path.join(__dirname, '../../countries-cities.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      worldData = JSON.parse(rawData);
      console.log(`✅ Loaded ${worldData.length} countries from JSON file`);
    } catch (error) {
      console.error('❌ Failed to load countries-cities.json:', error);
      worldData = [];
    }
  }
  return worldData;
}

// Cache for external API calls
let countriesCache: { data: Country[], timestamp: number } | null = null;
const citiesCache: Map<string, { data: City[], timestamp: number }> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for countries
const CITIES_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours for cities

class LocationService {
  /**
   * Get all countries from JSON file
   */
  async getAllCountries(): Promise<Country[]> {
    try {
      // Check cache first
      if (countriesCache && Date.now() - countriesCache.timestamp < CACHE_DURATION) {
        return countriesCache.data;
      }

      // Load from JSON file
      const data = loadWorldData();
      
      const countries = data.map((country: any) => ({
        id: country.iso2,
        code: country.iso2,
        name: country.name
      })).sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Update cache
      countriesCache = { data: countries, timestamp: Date.now() };
      
      console.log(`✅ Loaded ${countries.length} countries from JSON`);
      return countries;
    } catch (error) {
      console.error('❌ Error loading countries from JSON:', error);
      
      // Fallback to database
      return await prisma.countries.findMany({
        orderBy: { name: 'asc' },
      });
    }
  }

  /**
   * Get cities by country from JSON file
   */
  async getCitiesByCountry(countryId: string): Promise<City[]> {
    try {
      // Check cache first
      const cached = citiesCache.get(countryId);
      if (cached && Date.now() - cached.timestamp < CITIES_CACHE_DURATION) {
        console.log(`💾 Using cached cities for ${countryId}`);
        return cached.data;
      }

      // Load from JSON file
      const data = loadWorldData();
      
      // Find the country
      const country = data.find((c: any) => c.iso2 === countryId);
      
      if (!country) {
        console.log(`⚠️  Country ${countryId} not found in JSON`);
        return [];
      }

      const citiesSet = new Set<string>();
      
      // Extract all cities from all states
      if (country.states && Array.isArray(country.states)) {
        country.states.forEach((state: any) => {
          if (state.cities && Array.isArray(state.cities)) {
            state.cities.forEach((city: any) => {
              if (city.name && city.name.trim()) {
                citiesSet.add(city.name.trim());
              }
            });
          }
        });
      }

      console.log(`✅ Found ${citiesSet.size} cities for ${country.name} from JSON`);

      // If we got results, format and return them
      if (citiesSet.size > 0) {
        const cities: City[] = Array.from(citiesSet)
          .sort((a, b) => a.localeCompare(b))
          .map(name => ({
            id: `${countryId}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
            name: name,
            countryId: countryId
          }));

        // Update cache
        citiesCache.set(countryId, { data: cities, timestamp: Date.now() });
        
        return cities;
      }
    } catch (error) {
      console.error(`❌ Error fetching cities for ${countryId}:`, error);
    }

    // Final fallback to database
    console.log(`📂 Using database fallback for ${countryId}`);
    return await prisma.cities.findMany({
      where: { countryId },
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get hotels by city
   */
  async getHotelsByCity(cityId: string): Promise<Hotel[]> {
    return await prisma.hotels.findMany({
      where: { cityId },
      include: { 
        city: {
          include: { country: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create or get country
   */
  async upsertCountry(code: string, name: string): Promise<Country> {
    return await prisma.countries.upsert({
      where: { code },
      update: { name },
      create: {
        id: `country-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        code,
        name,
      },
    });
  }

  /**
   * Create or get city
   */
  async upsertCity(name: string, countryId: string): Promise<City> {
    // Find existing city with this name in this country
    const existing = await prisma.cities.findFirst({
      where: {
        name,
        countryId,
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.cities.create({
      data: {
        id: `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        countryId,
      },
      include: { country: true },
    });
  }

  /**
   * Create or update hotel
   */
  async upsertHotel(
    name: string,
    cityId: string,
    address?: string,
    phone?: string,
    email?: string,
    rating?: number
  ): Promise<Hotel> {
    // Find existing hotel with this name in this city
    const existing = await prisma.hotels.findFirst({
      where: {
        name,
        cityId,
      },
    });

    if (existing) {
      // Update if additional info provided
      if (address || phone || email || rating) {
        return await prisma.hotels.update({
          where: { id: existing.id },
          data: {
            address: address || existing.address,
            phone: phone || existing.phone,
            email: email || existing.email,
            rating: rating || existing.rating,
          },
          include: {
            city: {
              include: { country: true }
            }
          },
        });
      }
      return existing;
    }

    return await prisma.hotels.create({
      data: {
        id: `hotel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        cityId,
        address,
        phone,
        email,
        rating: rating || 3,
      },
      include: {
        city: {
          include: { country: true }
        }
      },
    });
  }

  /**
   * Initialize popular countries and cities
   */
  async initializeLocations(): Promise<void> {
    const locations = [
      // Middle East & GCC
      { country: { code: 'AE', name: 'United Arab Emirates' }, cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'] },
      { country: { code: 'SA', name: 'Saudi Arabia' }, cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk', 'Abha', 'Taif', 'Buraidah'] },
      { country: { code: 'QA', name: 'Qatar' }, cities: ['Doha', 'Al Wakrah', 'Al Rayyan', 'Umm Salal', 'Al Khor'] },
      { country: { code: 'KW', name: 'Kuwait' }, cities: ['Kuwait City', 'Hawally', 'Salmiya', 'Farwaniya', 'Jahra'] },
      { country: { code: 'OM', name: 'Oman' }, cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'] },
      { country: { code: 'BH', name: 'Bahrain' }, cities: ['Manama', 'Muharraq', 'Riffa', 'Hamad Town', 'Isa Town'] },
      { country: { code: 'JO', name: 'Jordan' }, cities: ['Amman', 'Aqaba', 'Petra', 'Jerash', 'Irbid', 'Zarqa'] },
      { country: { code: 'LB', name: 'Lebanon' }, cities: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Byblos'] },
      { country: { code: 'IQ', name: 'Iraq' }, cities: ['Baghdad', 'Basra', 'Erbil', 'Mosul', 'Najaf', 'Karbala'] },
      { country: { code: 'IL', name: 'Israel' }, cities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Nazareth'] },
      
      // North Africa
      { country: { code: 'EG', name: 'Egypt' }, cities: ['Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh', 'Hurghada', 'Luxor', 'Aswan', 'Port Said', 'Suez'] },
      { country: { code: 'MA', name: 'Morocco' }, cities: ['Casablanca', 'Marrakech', 'Rabat', 'Fes', 'Tangier', 'Agadir', 'Meknes'] },
      { country: { code: 'TN', name: 'Tunisia' }, cities: ['Tunis', 'Sousse', 'Sfax', 'Hammamet', 'Djerba', 'Monastir'] },
      { country: { code: 'DZ', name: 'Algeria' }, cities: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'] },
      { country: { code: 'LY', name: 'Libya' }, cities: ['Tripoli', 'Benghazi', 'Misrata', 'Bayda'] },
      
      // Sub-Saharan Africa
      { country: { code: 'ZA', name: 'South Africa' }, cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'] },
      { country: { code: 'KE', name: 'Kenya' }, cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { country: { code: 'NG', name: 'Nigeria' }, cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'] },
      { country: { code: 'ET', name: 'Ethiopia' }, cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Bahir Dar'] },
      { country: { code: 'TZ', name: 'Tanzania' }, cities: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Zanzibar'] },
      
      // Europe - Western
      { country: { code: 'GB', name: 'United Kingdom' }, cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool', 'Bristol', 'Leeds', 'Oxford', 'Cambridge'] },
      { country: { code: 'FR', name: 'France' }, cities: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Cannes', 'Bordeaux', 'Toulouse', 'Strasbourg', 'Nantes', 'Lille'] },
      { country: { code: 'DE', name: 'Germany' }, cities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Stuttgart', 'Dusseldorf', 'Dresden', 'Leipzig'] },
      { country: { code: 'IT', name: 'Italy' }, cities: ['Rome', 'Milan', 'Venice', 'Florence', 'Naples', 'Turin', 'Bologna', 'Verona', 'Pisa', 'Genoa'] },
      { country: { code: 'ES', name: 'Spain' }, cities: ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Malaga', 'Ibiza', 'Bilbao', 'Granada', 'Palma', 'Zaragoza'] },
      { country: { code: 'NL', name: 'Netherlands' }, cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen'] },
      { country: { code: 'BE', name: 'Belgium' }, cities: ['Brussels', 'Antwerp', 'Bruges', 'Ghent', 'Liege', 'Namur'] },
      { country: { code: 'CH', name: 'Switzerland' }, cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lucerne', 'Interlaken'] },
      { country: { code: 'AT', name: 'Austria' }, cities: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz'] },
      { country: { code: 'PT', name: 'Portugal' }, cities: ['Lisbon', 'Porto', 'Faro', 'Funchal', 'Coimbra', 'Braga'] },
      { country: { code: 'IE', name: 'Ireland' }, cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'] },
      
      // Europe - Eastern
      { country: { code: 'RU', name: 'Russia' }, cities: ['Moscow', 'St Petersburg', 'Kazan', 'Sochi', 'Yekaterinburg', 'Novosibirsk'] },
      { country: { code: 'PL', name: 'Poland' }, cities: ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw', 'Poznan', 'Lodz'] },
      { country: { code: 'CZ', name: 'Czech Republic' }, cities: ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Karlovy Vary'] },
      { country: { code: 'HU', name: 'Hungary' }, cities: ['Budapest', 'Debrecen', 'Szeged', 'Pecs', 'Gyor'] },
      { country: { code: 'RO', name: 'Romania' }, cities: ['Bucharest', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Brasov'] },
      { country: { code: 'BG', name: 'Bulgaria' }, cities: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse'] },
      { country: { code: 'UA', name: 'Ukraine' }, cities: ['Kyiv', 'Lviv', 'Odessa', 'Kharkiv', 'Dnipro'] },
      { country: { code: 'GR', name: 'Greece' }, cities: ['Athens', 'Thessaloniki', 'Mykonos', 'Santorini', 'Crete', 'Rhodes', 'Corfu'] },
      { country: { code: 'TR', name: 'Turkey' }, cities: ['Istanbul', 'Ankara', 'Antalya', 'Izmir', 'Bodrum', 'Cappadocia', 'Marmaris', 'Kusadasi', 'Bursa'] },
      
      // Europe - Nordic
      { country: { code: 'SE', name: 'Sweden' }, cities: ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala', 'Vasteras'] },
      { country: { code: 'NO', name: 'Norway' }, cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromso'] },
      { country: { code: 'DK', name: 'Denmark' }, cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'] },
      { country: { code: 'FI', name: 'Finland' }, cities: ['Helsinki', 'Espoo', 'Tampere', 'Turku', 'Oulu'] },
      { country: { code: 'IS', name: 'Iceland' }, cities: ['Reykjavik', 'Akureyri', 'Keflavik', 'Kopavogur'] },
      
      // Asia - East
      { country: { code: 'CN', name: 'China' }, cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong', 'Chengdu', 'Xian', 'Hangzhou', 'Suzhou'] },
      { country: { code: 'JP', name: 'Japan' }, cities: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Sapporo', 'Fukuoka', 'Nagoya', 'Kobe', 'Hiroshima', 'Nara'] },
      { country: { code: 'KR', name: 'South Korea' }, cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Jeju', 'Gwangju'] },
      { country: { code: 'TW', name: 'Taiwan' }, cities: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu'] },
      
      // Asia - Southeast
      { country: { code: 'TH', name: 'Thailand' }, cities: ['Bangkok', 'Phuket', 'Pattaya', 'Chiang Mai', 'Krabi', 'Koh Samui', 'Hua Hin', 'Ayutthaya', 'Chiang Rai'] },
      { country: { code: 'SG', name: 'Singapore' }, cities: ['Singapore', 'Sentosa', 'Jurong', 'Woodlands'] },
      { country: { code: 'MY', name: 'Malaysia' }, cities: ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Malacca', 'Langkawi', 'Kota Kinabalu', 'Ipoh'] },
      { country: { code: 'ID', name: 'Indonesia' }, cities: ['Jakarta', 'Bali', 'Surabaya', 'Bandung', 'Yogyakarta', 'Lombok', 'Medan'] },
      { country: { code: 'PH', name: 'Philippines' }, cities: ['Manila', 'Cebu', 'Davao', 'Boracay', 'Palawan', 'Baguio'] },
      { country: { code: 'VN', name: 'Vietnam' }, cities: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hoi An', 'Nha Trang', 'Hue', 'Halong Bay'] },
      { country: { code: 'KH', name: 'Cambodia' }, cities: ['Phnom Penh', 'Siem Reap', 'Sihanoukville', 'Battambang'] },
      { country: { code: 'LA', name: 'Laos' }, cities: ['Vientiane', 'Luang Prabang', 'Pakse', 'Vang Vieng'] },
      { country: { code: 'MM', name: 'Myanmar' }, cities: ['Yangon', 'Mandalay', 'Bagan', 'Naypyidaw'] },
      
      // Asia - South
      { country: { code: 'IN', name: 'India' }, cities: ['Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa', 'Agra', 'Varanasi'] },
      { country: { code: 'PK', name: 'Pakistan' }, cities: ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan'] },
      { country: { code: 'BD', name: 'Bangladesh' }, cities: ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', "Cox's Bazar"] },
      { country: { code: 'LK', name: 'Sri Lanka' }, cities: ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Ella', 'Nuwara Eliya'] },
      { country: { code: 'NP', name: 'Nepal' }, cities: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur'] },
      { country: { code: 'MV', name: 'Maldives' }, cities: ['Male', 'Addu City', 'Fuvahmulah', 'Hulhumale'] },
      
      // Asia - Central
      { country: { code: 'AZ', name: 'Azerbaijan' }, cities: ['Baku', 'Ganja', 'Sumqayit', 'Lankaran'] },
      { country: { code: 'GE', name: 'Georgia' }, cities: ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi'] },
      { country: { code: 'AM', name: 'Armenia' }, cities: ['Yerevan', 'Gyumri', 'Vanadzor'] },
      { country: { code: 'KZ', name: 'Kazakhstan' }, cities: ['Almaty', 'Nur-Sultan', 'Shymkent', 'Aktobe'] },
      { country: { code: 'UZ', name: 'Uzbekistan' }, cities: ['Tashkent', 'Samarkand', 'Bukhara', 'Khiva'] },
      
      // Americas - North
      { country: { code: 'US', name: 'United States' }, cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'San Francisco', 'Orlando', 'Boston', 'Seattle', 'Washington DC', 'Houston', 'Atlanta'] },
      { country: { code: 'CA', name: 'Canada' }, cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Quebec City', 'Winnipeg'] },
      { country: { code: 'MX', name: 'Mexico' }, cities: ['Mexico City', 'Cancun', 'Guadalajara', 'Monterrey', 'Playa del Carmen', 'Tulum', 'Puerto Vallarta', 'Los Cabos'] },
      
      // Americas - South
      { country: { code: 'BR', name: 'Brazil' }, cities: ['Rio de Janeiro', 'Sao Paulo', 'Brasilia', 'Salvador', 'Fortaleza', 'Manaus', 'Belo Horizonte'] },
      { country: { code: 'AR', name: 'Argentina' }, cities: ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'Bariloche'] },
      { country: { code: 'CL', name: 'Chile' }, cities: ['Santiago', 'Valparaiso', 'Vina del Mar', 'Concepcion'] },
      { country: { code: 'CO', name: 'Colombia' }, cities: ['Bogota', 'Medellin', 'Cartagena', 'Cali', 'Barranquilla'] },
      { country: { code: 'PE', name: 'Peru' }, cities: ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Machu Picchu'] },
      { country: { code: 'VE', name: 'Venezuela' }, cities: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto'] },
      { country: { code: 'EC', name: 'Ecuador' }, cities: ['Quito', 'Guayaquil', 'Cuenca', 'Galapagos'] },
      
      // Oceania
      { country: { code: 'AU', name: 'Australia' }, cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Cairns'] },
      { country: { code: 'NZ', name: 'New Zealand' }, cities: ['Auckland', 'Wellington', 'Christchurch', 'Queenstown', 'Rotorua', 'Dunedin'] },
      { country: { code: 'FJ', name: 'Fiji' }, cities: ['Suva', 'Nadi', 'Lautoka', 'Labasa'] },
      
      // Caribbean
      { country: { code: 'CU', name: 'Cuba' }, cities: ['Havana', 'Varadero', 'Santiago de Cuba', 'Trinidad'] },
      { country: { code: 'DO', name: 'Dominican Republic' }, cities: ['Santo Domingo', 'Punta Cana', 'Puerto Plata', 'La Romana'] },
      { country: { code: 'JM', name: 'Jamaica' }, cities: ['Kingston', 'Montego Bay', 'Ocho Rios', 'Negril'] },
      { country: { code: 'BS', name: 'Bahamas' }, cities: ['Nassau', 'Freeport', 'Paradise Island'] },
      { country: { code: 'BB', name: 'Barbados' }, cities: ['Bridgetown', 'Holetown', 'Speightstown'] },
    ];

    console.log('🌍 Initializing world countries and cities...');

    for (const location of locations) {
      const country = await this.upsertCountry(location.country.code, location.country.name);
      console.log(`  ✅ ${country.name}`);

      for (const cityName of location.cities) {
        await this.upsertCity(cityName, country.id);
      }
      console.log(`    🏛️ Added ${location.cities.length} cities`);
    }

    console.log(`✅ ${locations.length} countries and their cities initialized`);
  }
}

export const locationService = new LocationService();
