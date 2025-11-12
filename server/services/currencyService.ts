import axios from 'axios';
import { prisma } from '../lib/prisma';

// Free Exchange Rate API (no key required for basic usage)
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/AED';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRateToAED: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface ExchangeRates {
  [key: string]: number;
}

class CurrencyService {
  /**
   * Get all currencies
   */
  async getAllCurrencies(): Promise<Currency[]> {
    
    const currencies = await prisma.currencies.findMany({
      orderBy: {
        code: 'asc',
      },
    });

    return currencies;
  }

  /**
   * Get active currencies only
   */
  async getActiveCurrencies(): Promise<Currency[]> {
    
    const currencies = await prisma.currencies.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return currencies;
  }

  /**
   * Get currency by code
   */
  async getCurrencyByCode(code: string): Promise<Currency | null> {
    
    const currency = await prisma.currencies.findUnique({
      where: { code: code.toUpperCase() },
    });

    return currency;
  }

  /**
   * Create or update currency
   */
  async upsertCurrency(
    code: string,
    name: string,
    symbol: string,
    exchangeRateToAED: number
  ): Promise<Currency> {
    
    const currency = await prisma.currencies.upsert({
      where: { code: code.toUpperCase() },
      update: {
        name,
        symbol,
        exchangeRateToAED,
        lastUpdated: new Date(),
      },
      create: {
        id: `currency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        code: code.toUpperCase(),
        name,
        symbol,
        exchangeRateToAED,
        isActive: true,
        lastUpdated: new Date(),
      },
    });

    return currency;
  }

  /**
   * Update currency exchange rate
   */
  async updateExchangeRate(code: string, rate: number): Promise<Currency> {
    
    const currency = await prisma.currencies.update({
      where: { code: code.toUpperCase() },
      data: {
        exchangeRateToAED: rate,
        lastUpdated: new Date(),
      },
    });

    return currency;
  }

  /**
   * Fetch latest exchange rates from API
   */
  async fetchExchangeRates(): Promise<ExchangeRates> {
    try {
      console.log('🌍 Fetching latest exchange rates from API...');
      const response = await axios.get(EXCHANGE_API_URL, {
        timeout: 10000, // 10 second timeout
      });

      if (response.data && response.data.rates) {
        console.log('✅ Exchange rates fetched successfully');
        return response.data.rates;
      }

      throw new Error('Invalid API response format');
    } catch (error: any) {
      console.error('❌ Error fetching exchange rates:', error.message);
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }
  }

  /**
   * Update all currency rates from API
   */
  async updateAllRates(): Promise<{ success: boolean; updated: number; errors: string[] }> {
    
    try {
      console.log('💱 Starting daily currency rate update...');
      
      // Fetch latest rates
      const rates = await this.fetchExchangeRates();
      
      // Get all active currencies
      const currencies = await prisma.currencies.findMany({
        where: { isActive: true },
      });

      let updated = 0;
      const errors: string[] = [];

      // Update each currency
      for (const currency of currencies) {
        try {
          if (currency.code === 'AED') {
            // AED is base currency, always 1
            await this.updateExchangeRate('AED', 1);
            updated++;
          } else if (rates[currency.code]) {
            // Convert rate: From AED to currency
            // If API gives USD rate as 0.27 (meaning 1 AED = 0.27 USD)
            // We need to store as 3.67 (meaning 1 USD = 3.67 AED)
            const rateFromAED = rates[currency.code];
            const rateToAED = 1 / rateFromAED;
            
            await this.updateExchangeRate(currency.code, rateToAED);
            updated++;
            console.log(`  ✅ ${currency.code}: 1 ${currency.code} = ${rateToAED.toFixed(4)} AED`);
          } else {
            errors.push(`Rate not found for ${currency.code}`);
            console.warn(`  ⚠️  ${currency.code}: Rate not available`);
          }
        } catch (error: any) {
          errors.push(`Error updating ${currency.code}: ${error.message}`);
          console.error(`  ❌ ${currency.code}: ${error.message}`);
        }
      }

      console.log(`✅ Currency update complete: ${updated} updated, ${errors.length} errors`);
      
      return {
        success: true,
        updated,
        errors,
      };
    } catch (error: any) {
      console.error('❌ Currency update failed:', error.message);
      return {
        success: false,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }


    // Get both currencies
    const [from, to] = await Promise.all([
      prisma.currencies.findUnique({ where: { code: fromCurrency.toUpperCase() } }),
      prisma.currencies.findUnique({ where: { code: toCurrency.toUpperCase() } }),
    ]);

    if (!from || !to) {
      throw new Error(`Currency not found: ${!from ? fromCurrency : toCurrency}`);
    }

    // Convert: amount * (fromRate / toRate)
    // Example: 100 USD to EUR
    // If USD = 3.67 AED and EUR = 4.02 AED
    // 100 * (3.67 / 4.02) = 91.29 EUR
    const result = amount * (from.exchangeRateToAED / to.exchangeRateToAED);
    
    return Math.round(result * 100) / 100; // Round to 2 decimals
  }

  /**
   * Convert any currency to AED (base currency)
   */
  async convertToAED(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'AED') {
      return amount;
    }

    const currency = await prisma.currencies.findUnique({
      where: { code: fromCurrency.toUpperCase() },
    });

    if (!currency) {
      throw new Error(`Currency not found: ${fromCurrency}`);
    }

    // Convert to AED: amount * rate
    const result = amount * currency.exchangeRateToAED;
    return Math.round(result * 100) / 100;
  }

  /**
   * Toggle currency active status
   */
  async toggleCurrencyStatus(code: string): Promise<Currency> {
    
    const currency = await prisma.currencies.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new Error(`Currency not found: ${code}`);
    }

    const updated = await prisma.currencies.update({
      where: { code: code.toUpperCase() },
      data: {
        isActive: !currency.isActive,
      },
    });

    return updated;
  }

  /**
   * Initialize default currencies
   */
  async initializeDefaultCurrencies(): Promise<void> {
    
    const defaultCurrencies = [
      // Base Currency
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 1 },
      
      // Major World Currencies
      { code: 'USD', name: 'US Dollar', symbol: '$', rate: 3.67 },
      { code: 'EUR', name: 'Euro', symbol: '€', rate: 4.02 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate: 4.68 },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 0.025 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rate: 4.15 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 2.71 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 2.42 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 0.51 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 0.044 },
      
      // GCC Currencies
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rate: 0.98 },
      { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', rate: 1.01 },
      { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', rate: 12.0 },
      { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', rate: 9.53 },
      { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', rate: 9.75 },
      
      // Middle East & Africa
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', rate: 0.075 },
      { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', rate: 5.17 },
      { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', rate: 0.0024 },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 0.136 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 0.20 },
      { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م', rate: 0.37 },
      
      // Asia Pacific
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 2.73 },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 0.47 },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rate: 0.82 },
      { code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 0.107 },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rate: 0.00023 },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rate: 0.064 },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', rate: 0.013 },
      { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 0.034 },
      { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', rate: 0.012 },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩', rate: 0.0027 },
      
      // Europe
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 0.35 },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 0.34 },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', rate: 0.54 },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', rate: 0.93 },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', rate: 0.162 },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', rate: 0.010 },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: 0.039 },
      
      // Americas
      { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', rate: 0.21 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 0.73 },
      { code: 'ARS', name: 'Argentine Peso', symbol: '$', rate: 0.0037 },
      { code: 'CLP', name: 'Chilean Peso', symbol: '$', rate: 0.0038 },
      { code: 'COP', name: 'Colombian Peso', symbol: '$', rate: 0.00093 },
      
      // Others
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 2.23 },
      { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', rate: 0.99 },
    ];

    console.log('💱 Initializing default currencies...');

    for (const curr of defaultCurrencies) {
      try {
        await this.upsertCurrency(curr.code, curr.name, curr.symbol, curr.rate);
        console.log(`  ✅ ${curr.code} - ${curr.name}`);
      } catch (error: any) {
        console.error(`  ❌ ${curr.code}: ${error.message}`);
      }
    }

    console.log(`✅ ${defaultCurrencies.length} default currencies initialized`);
  }
}

export const currencyService = new CurrencyService();
