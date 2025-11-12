import { Response } from 'express';
import { AuthRequest } from '../types';
import { fileService } from '../services/fileService';
import { generateFilePDF, ensureUploadDir } from '../utils/pdfGenerator';
import path from 'path';
import { prisma } from '../lib/prisma';

export class FileController {
  /**
   * Create file
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const file = await fileService.createFile({
        ...req.body,
        createdById: req.user.id
      });
      
      res.status(201).json({
        success: true,
        data: file
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get all files
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        customerId: req.query.customerId as string | undefined,
        serviceType: req.query.serviceType as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      
      const files = await fileService.getFiles(filters);
      
      res.json({
        success: true,
        data: files
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get file by ID
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const file = await fileService.getFileById(id);
      
      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: file
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update file status
   */
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const file = await fileService.updateFileStatus(id, status);
      
      res.json({
        success: true,
        data: file
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Generate PDF
   */
  async generatePDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const file = await fileService.getFileById(id);
      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      
      const companySettings = await prisma.company_settings.findFirst();
      if (!companySettings) {
        res.status(400).json({
          success: false,
          error: 'Company settings not found'
        });
        return;
      }
      
      ensureUploadDir();
      
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filename = `file-${file.fileNumber}.pdf`;
      const outputPath = path.join(uploadDir, 'pdfs', filename);
      
      await generateFilePDF(file, companySettings, outputPath);
      
      // Update file with PDF path
      await prisma.files.update({
        where: { id },
        data: { pdfPath: outputPath }
      });
      
      res.json({
        success: true,
        data: {
          pdfPath: outputPath,
          downloadUrl: `/api/files/${id}/download`
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Download PDF
   */
  async downloadPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const file = await fileService.getFileById(id);
      if (!file || !file.pdfPath) {
        res.status(404).json({
          success: false,
          error: 'PDF not found'
        });
        return;
      }
      
      res.download(file.pdfPath, `file-${file.fileNumber}.pdf`);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Delete file
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await fileService.deleteFile(id);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const fileController = new FileController();

