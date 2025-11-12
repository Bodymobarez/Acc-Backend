import { Request, Response } from 'express';
import { settingsService } from '../services/settingsService';

class SettingsController {
  // Company Settings
  async getCompanySettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getCompanySettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error getting company settings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch company settings' });
    }
  }

  async updateCompanySettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const settings = await settingsService.updateCompanySettings(id, req.body);
      res.json(settings);
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      res.status(500).json({ error: error.message || 'Failed to update company settings' });
    }
  }

  // System Settings
  async getAllSystemSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getAllSystemSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error getting system settings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch system settings' });
    }
  }

  async getSystemSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const setting = await settingsService.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      res.json(setting);
    } catch (error: any) {
      console.error('Error getting system setting:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch system setting' });
    }
  }

  async upsertSystemSetting(req: Request, res: Response) {
    try {
      const setting = await settingsService.upsertSystemSetting(req.body);
      res.json(setting);
    } catch (error: any) {
      console.error('Error upserting system setting:', error);
      res.status(500).json({ error: error.message || 'Failed to save system setting' });
    }
  }

  async deleteSystemSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      await settingsService.deleteSystemSetting(key);
      res.json({ message: 'Setting deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting system setting:', error);
      res.status(500).json({ error: error.message || 'Failed to delete system setting' });
    }
  }

  // Print Settings
  async getPrintSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getPrintSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('Error getting print settings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch print settings' });
    }
  }

  async updatePrintSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.updatePrintSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      console.error('Error updating print settings:', error);
      res.status(500).json({ error: error.message || 'Failed to update print settings' });
    }
  }
}

export const settingsController = new SettingsController();
