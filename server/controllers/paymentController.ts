import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

export const paymentController = {
  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      const payment = await paymentService.create({
        ...req.body,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully'
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment'
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        category: req.query.category as string,
        paymentMethod: req.query.paymentMethod as string,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined
      };

      const payments = await paymentService.getAll(filters);

      res.json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payments'
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getById(id);

      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      res.status(error.message === 'Payment not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch payment'
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payment = await paymentService.update(id, req.body);

      res.json({
        success: true,
        data: payment,
        message: 'Payment updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update payment'
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await paymentService.delete(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete payment'
      });
    }
  },

  async generateNumber(req: Request, res: Response) {
    try {
      const paymentNumber = await paymentService.generatePaymentNumber();

      res.json({
        success: true,
        data: { paymentNumber }
      });
    } catch (error: any) {
      console.error('Error generating payment number:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate payment number'
      });
    }
  },

  async getStatistics(req: Request, res: Response) {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        category: req.query.category as string,
        paymentMethod: req.query.paymentMethod as string,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const statistics = await paymentService.getStatistics(filters);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Error fetching payment statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payment statistics'
      });
    }
  }
};
