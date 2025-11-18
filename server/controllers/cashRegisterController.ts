import { Request, Response } from 'express';
import { cashRegisterService } from '../services/cashRegisterService';

export const cashRegisterController = {
  async create(req: Request, res: Response) {
    try {
      const cashRegister = await cashRegisterService.create(req.body);

      res.status(201).json({
        success: true,
        data: cashRegister,
        message: 'Cash register created successfully'
      });
    } catch (error: any) {
      console.error('Error creating cash register:', error);
      res.status(error.message.includes('already exists') ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to create cash register'
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const filters = {
        currency: req.query.currency as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const cashRegisters = await cashRegisterService.getAll(filters);

      res.json({
        success: true,
        data: cashRegisters,
        count: cashRegisters.length
      });
    } catch (error: any) {
      console.error('Error fetching cash registers:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch cash registers'
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cashRegister = await cashRegisterService.getById(id);

      res.json({
        success: true,
        data: cashRegister
      });
    } catch (error: any) {
      console.error('Error fetching cash register:', error);
      res.status(error.message === 'Cash register not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch cash register'
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cashRegister = await cashRegisterService.update(id, req.body);

      res.json({
        success: true,
        data: cashRegister,
        message: 'Cash register updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating cash register:', error);
      res.status(error.message.includes('already exists') ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update cash register'
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await cashRegisterService.delete(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error deleting cash register:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete cash register'
      });
    }
  },

  async updateBalance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, operation } = req.body;

      if (!amount || !operation) {
        return res.status(400).json({
          success: false,
          message: 'Amount and operation are required'
        });
      }

      if (operation !== 'add' && operation !== 'subtract') {
        return res.status(400).json({
          success: false,
          message: 'Operation must be either "add" or "subtract"'
        });
      }

      const cashRegister = await cashRegisterService.updateBalance(id, amount, operation);

      res.json({
        success: true,
        data: cashRegister,
        message: 'Cash register balance updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating cash register balance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update cash register balance'
      });
    }
  }
};
