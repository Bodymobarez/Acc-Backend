import { paymentService } from '../services/paymentService';
export const paymentController = {
    async create(req, res) {
        try {
            const userId = req.user?.id;
            const payment = await paymentService.create({
                ...req.body,
                createdById: userId
            });
            res.status(201).json({
                success: true,
                data: payment,
                message: 'Payment created successfully'
            });
        }
        catch (error) {
            console.error('Error creating payment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create payment'
            });
        }
    },
    async getAll(req, res) {
        try {
            const filters = {
                supplierId: req.query.supplierId,
                category: req.query.category,
                paymentMethod: req.query.paymentMethod,
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
                maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined
            };
            const payments = await paymentService.getAll(filters);
            res.json({
                success: true,
                data: payments,
                count: payments.length
            });
        }
        catch (error) {
            console.error('Error fetching payments:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch payments'
            });
        }
    },
    async getById(req, res) {
        try {
            const { id } = req.params;
            const payment = await paymentService.getById(id);
            res.json({
                success: true,
                data: payment
            });
        }
        catch (error) {
            console.error('Error fetching payment:', error);
            res.status(error.message === 'Payment not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to fetch payment'
            });
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const payment = await paymentService.update(id, req.body);
            res.json({
                success: true,
                data: payment,
                message: 'Payment updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating payment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update payment'
            });
        }
    },
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await paymentService.delete(id);
            res.json({
                success: true,
                message: result.message
            });
        }
        catch (error) {
            console.error('Error deleting payment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete payment'
            });
        }
    },
    async generateNumber(req, res) {
        try {
            const paymentNumber = await paymentService.generatePaymentNumber();
            res.json({
                success: true,
                data: { paymentNumber }
            });
        }
        catch (error) {
            console.error('Error generating payment number:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate payment number'
            });
        }
    },
    async getStatistics(req, res) {
        try {
            const filters = {
                supplierId: req.query.supplierId,
                category: req.query.category,
                paymentMethod: req.query.paymentMethod,
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
            };
            const statistics = await paymentService.getStatistics(filters);
            res.json({
                success: true,
                data: statistics
            });
        }
        catch (error) {
            console.error('Error fetching payment statistics:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch payment statistics'
            });
        }
    }
};
