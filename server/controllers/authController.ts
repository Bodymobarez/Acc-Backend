import { Response } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/authService';

export class AuthController {
  /**
   * Login
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      
      console.log('🔐 Login attempt for username:', username);
      
      const result = await authService.login({ username, password });
      
      console.log('✅ Login successful for:', username);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      console.error('Stack:', error.stack);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Register
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, email, password, firstName, lastName, role } = req.body;
      
      const result = await authService.register({
        username,
        email,
        password,
        firstName,
        lastName,
        role
      });
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const user = await authService.getProfile(req.user.id);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { firstName, lastName } = req.body;
      
      const user = await authService.updateProfile(req.user.id, {
        firstName,
        lastName
      });
      
      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Change password
   */
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { oldPassword, newPassword } = req.body;
      
      await authService.changePassword(req.user.id, oldPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const authController = new AuthController();

