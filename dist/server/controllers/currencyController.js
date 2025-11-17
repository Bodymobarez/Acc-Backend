import { currencyService } from '../services/currencyService';
class CurrencyController {
    /**
     * Get all currencies
     */
    async getAll(req, res) {
        try {
            const currencies = await currencyService.getAllCurrencies();
            res.json({
                success: true,
                data: currencies,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get active currencies
     */
    async getActive(req, res) {
        try {
            const currencies = await currencyService.getActiveCurrencies();
            res.json({
                success: true,
                data: currencies,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get currency by code
     */
    async getByCode(req, res) {
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
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Update all currency rates from API
     */
    async updateRates(req, res) {
        try {
            const result = await currencyService.updateAllRates();
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Update specific currency rate manually
     */
    async updateManualRate(req, res) {
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
            const currency = await currencyService.updateExchangeRate(code, parseFloat(exchangeRateToAED));
            res.json({
                success: true,
                data: currency,
                message: `${code} rate updated successfully`,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Convert currency
     */
    async convert(req, res) {
        try {
            const { amount, from, to } = req.body;
            if (!amount || !from || !to) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: amount, from, to',
                });
                return;
            }
            const result = await currencyService.convertCurrency(parseFloat(amount), from, to);
            res.json({
                success: true,
                data: {
                    from,
                    to,
                    originalAmount: parseFloat(amount),
                    convertedAmount: result,
                },
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Toggle currency status
     */
    async toggleStatus(req, res) {
        try {
            const { code } = req.params;
            const currency = await currencyService.toggleCurrencyStatus(code);
            res.json({
                success: true,
                data: currency,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Initialize default currencies
     */
    async initializeDefaults(req, res) {
        try {
            await currencyService.initializeDefaultCurrencies();
            res.json({
                success: true,
                message: 'Default currencies initialized',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
export const currencyController = new CurrencyController();
