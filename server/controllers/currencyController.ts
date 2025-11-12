import { Response } from 'express';
import { currencyService } from '../services/currencyService';
import { AuthRequest } from '../types';

class CurrencyController {
  /**
   * Get all currencies
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencies = await currencyService.getAllCurrencies();
      
      res.json({
        success: true,
        data: currencies,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get active currencies
   */
  async getActive(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencies = await currencyService.getActiveCurrencies();
      
      res.json({
        success: true,
        data: currencies,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get currency by code
   */
  async getByCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const currency = await currencyService.getCurrencyByCode(code);
      
      if (!currency) {
        res.status(404).json({
          success: false,
          error: 'Currency not found',
        });
        return;
      }

      res.json({
        success: true,
        data: currency,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update all currency rates from API
   */
  async updateRates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await currencyService.updateAllRates();
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update specific currency rate manually
   */
  async updateManualRate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { exchangeRateToAED } = req.body;

      if (!exchangeRateToAED || isNaN(exchangeRateToAED)) {
        res.status(400).json({
          success: false,
          error: 'Invalid exchange rate',
        });
        return;
      }

      const currency = await currencyService.updateExchangeRate(
        code,
        parseFloat(exchangeRateToAED)
      );
      
      res.json({
        success: true,
        data: currency,
        message: `${code} rate updated successfully`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Convert currency
   */
  async convert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { amount, from, to } = req.body;

      if (!amount || !from || !to) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, from, to',
        });
        return;
      }

      const result = await currencyService.convertCurrency(
        parseFloat(amount),
        from,
        to
      );
      
      res.json({
        success: true,
        data: {
          from,
          to,
          originalAmount: parseFloat(amount),
          convertedAmount: result,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Toggle currency status
   */
  async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const currency = await currencyService.toggleCurrencyStatus(code);
      
      res.json({
        success: true,
        data: currency,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Initialize default currencies
   */
  async initializeDefaults(req: AuthRequest, res: Response): Promise<void> {
    try {
      await currencyService.initializeDefaultCurrencies();
      
      res.json({
        success: true,
        message: 'Default currencies initialized',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export const currencyController = new CurrencyController();
