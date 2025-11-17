import { Request, Response } from 'express';
import { bankAccountService } from '../services/bankAccountService';

export const bankAccountController = {
  async create(req: Request, res: Response) {
    try {
      const bankAccount = await bankAccountService.create(req.body);

      res.status(201).json({
        success: true,
        data: bankAccount,
        message: 'Bank account created successfully'
      });
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      res.status(error.message === 'Account number already exists' ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to create bank account'
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const filters = {
        bankName: req.query.bankName as string,
        currency: req.query.currency as string,
        accountType: req.query.accountType as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const bankAccounts = await bankAccountService.getAll(filters);

      res.json({
        success: true,
        data: bankAccounts,
        count: bankAccounts.length
      });
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch bank accounts'
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bankAccount = await bankAccountService.getById(id);

      res.json({
        success: true,
        data: bankAccount
      });
    } catch (error: any) {
      console.error('Error fetching bank account:', error);
      res.status(error.message === 'Bank account not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch bank account'
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bankAccount = await bankAccountService.update(id, req.body);

      res.json({
        success: true,
        data: bankAccount,
        message: 'Bank account updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating bank account:', error);
      res.status(error.message.includes('already exists') ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update bank account'
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await bankAccountService.delete(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      res.status(error.message.includes('existing payments') ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to delete bank account'
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

      const bankAccount = await bankAccountService.updateBalance(id, amount, operation);

      res.json({
        success: true,
        data: bankAccount,
        message: 'Bank account balance updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating bank account balance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update bank account balance'
      });
    }
  },

  async getStatistics(req: Request, res: Response) {
    try {
      const filters = {
        bankName: req.query.bankName as string,
        currency: req.query.currency as string,
        accountType: req.query.accountType as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const statistics = await bankAccountService.getStatistics(filters);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Error fetching bank account statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch bank account statistics'
      });
    }
  }
};
