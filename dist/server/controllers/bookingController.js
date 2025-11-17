import { bookingService } from '../services/bookingService';
import { cancellationService } from '../services/cancellationService';
export class BookingController {
    /**
     * Create booking
     */
    async create(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            console.log('📦 Creating booking with data:', {
                serviceType: req.body.serviceType,
                customerId: req.body.customerId,
                supplierId: req.body.supplierId,
                userId: req.user.id
            });
            const booking = await bookingService.createBooking({
                ...req.body,
                createdById: req.user.id
            });
            console.log('✅ Booking created successfully:', booking.id);
            res.status(201).json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            console.error('❌ Booking creation failed:', {
                message: error.message,
                stack: error.stack,
                body: req.body
            });
            res.status(400).json({
                success: false,
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
    /**
     * Get all bookings (with RBAC filtering)
     */
    async getAll(req, res) {
        try {
            // Get RBAC filter from middleware
            const rbacFilter = req.bookingFilter;
            const filters = {
                status: req.query.status,
                serviceType: req.query.serviceType,
                customerId: req.query.customerId,
                supplierId: req.query.supplierId,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
            };
            const bookings = await bookingService.getBookings(filters, rbacFilter);
            res.json({
                success: true,
                data: bookings
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Get booking by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const booking = await bookingService.getBookingById(id);
            if (!booking) {
                res.status(404).json({
                    success: false,
                    error: 'Booking not found'
                });
                return;
            }
            res.json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Update booking
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const booking = await bookingService.updateBooking(id, req.body);
            res.json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Update commissions
     */
    async updateCommissions(req, res) {
        try {
            const { id } = req.params;
            const { agentCommissionRate, csCommissionRate } = req.body;
            const booking = await bookingService.updateCommissions(id, {
                agentCommissionRate,
                csCommissionRate
            });
            res.json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Approve booking
     */
    async approve(req, res) {
        try {
            const { id } = req.params;
            const booking = await bookingService.approveBooking(id);
            res.json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Delete booking
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            await bookingService.deleteBooking(id);
            res.json({
                success: true,
                message: 'Booking deleted successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Cancel booking with refund
     * - Creates refund booking with negative amounts
     * - Cancels invoice if exists
     * - Adds credit note info if invoice was paid
     * - Sets original booking status to CANCELLED
     */
    async cancelWithRefund(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const result = await cancellationService.cancelBookingWithRefund(id, req.user.id);
            res.json({
                success: true,
                data: result,
                message: 'Booking cancelled successfully with refund'
            });
        }
        catch (error) {
            console.error('Error cancelling booking:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Add supplier to booking
     */
    async addSupplier(req, res) {
        try {
            const { id } = req.params;
            const { supplierId, serviceType, costAmount, costCurrency, description } = req.body;
            const bookingSupplier = await bookingService.addBookingSupplier(id, supplierId, serviceType, costAmount, costCurrency, description);
            res.status(201).json({
                success: true,
                data: bookingSupplier
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Get booking suppliers
     */
    async getSuppliers(req, res) {
        try {
            const { id } = req.params;
            const suppliers = await bookingService.getBookingSuppliers(id);
            res.json({
                success: true,
                data: suppliers
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Remove supplier from booking
     */
    async removeSupplier(req, res) {
        try {
            const { supplierId } = req.params;
            await bookingService.removeBookingSupplier(supplierId);
            res.json({
                success: true,
                message: 'Supplier removed successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}
export const bookingController = new BookingController();
