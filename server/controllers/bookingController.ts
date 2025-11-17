import { Response } from 'express';
import { AuthRequest } from '../types';
import { bookingService } from '../services/bookingService';
import { cancellationService } from '../services/cancellationService';

export class BookingController {
  /**
   * Create booking
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
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
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get RBAC filter from middleware
      const rbacFilter = (req as any).bookingFilter;
      
      const filters = {
        status: req.query.status as string | undefined,
        serviceType: req.query.serviceType as string | undefined,
        customerId: req.query.customerId as string | undefined,
        supplierId: req.query.supplierId as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      if (filters.startDate) {
        filters.startDate.setHours(0, 0, 0, 0);
      }
      if (filters.endDate) {
        filters.endDate.setHours(23, 59, 59, 999);
      }
      
      const bookings = await bookingService.getBookings(filters, rbacFilter);
      
      res.json({
        success: true,
        data: bookings
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get booking by ID
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update booking
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await bookingService.updateBooking(id, req.body);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update commissions
   */
  async updateCommissions(req: AuthRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Approve booking
   */
  async approve(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await bookingService.approveBooking(id);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Delete booking
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await bookingService.deleteBooking(id);
      
      res.json({
        success: true,
        message: 'Booking deleted successfully'
      });
    } catch (error: any) {
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
  async cancelWithRefund(req: AuthRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
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
  async addSupplier(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { supplierId, serviceType, costAmount, costCurrency, description } = req.body;
      
      const bookingSupplier = await bookingService.addBookingSupplier(
        id,
        supplierId,
        serviceType,
        costAmount,
        costCurrency,
        description
      );
      
      res.status(201).json({
        success: true,
        data: bookingSupplier
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get booking suppliers
   */
  async getSuppliers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const suppliers = await bookingService.getBookingSuppliers(id);
      
      res.json({
        success: true,
        data: suppliers
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove supplier from booking
   */
  async removeSupplier(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      await bookingService.removeBookingSupplier(supplierId);
      
      res.json({
        success: true,
        message: 'Supplier removed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const bookingController = new BookingController();

