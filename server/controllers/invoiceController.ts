import { Response } from 'express';
import { AuthRequest } from '../types';
import { invoiceService } from '../services/invoiceService';
import { generateInvoicePDF, ensureUploadDir } from '../utils/pdfGenerator';
import path from 'path';
import { prisma } from '../lib/prisma';

export class InvoiceController {
  /**
   * Create invoice
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const invoice = await invoiceService.createInvoice({
        ...req.body,
        createdById: req.user.id
      });
      
      res.status(201).json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get all invoices
   */
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        customerId: req.query.customerId as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      
      const invoices = await invoiceService.getInvoices(filters);
      
      res.json({
        success: true,
        data: invoices
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get invoice by ID
   */
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);
      
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get invoice by booking ID
   */
  async getByBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const invoice = await invoiceService.getInvoiceByBooking(bookingId);
      
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found for this booking'
        });
        return;
      }
      
      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Update invoice status
   */
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, paidDate } = req.body;
      
      const invoice = await invoiceService.updateInvoiceStatus(
        id,
        status,
        paidDate ? new Date(paidDate) : undefined
      );
      
      res.json({
        success: true,
        data: invoice
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update invoice (generic)
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // First, check if invoice has matched receipts (PAID or PARTIALLY_PAID)
      const existingInvoice = await prisma.invoices.findUnique({
        where: { id },
        select: { status: true }
      });
      
      if (!existingInvoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }
      
      // Prevent updates to PAID or PARTIALLY_PAID invoices (except status changes to unmatch)
      if ((existingInvoice.status === 'PAID' || existingInvoice.status === 'PARTIALLY_PAID') &&
          !(Object.keys(updateData).length === 1 && 'status' in updateData)) {
        res.status(400).json({
          success: false,
          error: 'Cannot modify this invoice. It has matched payments. Please unmatch the receipts first.'
        });
        return;
      }
      
      // If only status is being updated, use updateInvoiceStatus
      if (Object.keys(updateData).length === 1 && 'status' in updateData) {
        const invoice = await invoiceService.updateInvoiceStatus(
          id,
          updateData.status,
          updateData.status === 'PAID' ? new Date() : undefined
        );
        
        res.json({
          success: true,
          data: invoice
        });
        return;
      }
      
      // For other updates, use Prisma directly
      const invoice = await prisma.invoices.update({
        where: { id },
        data: updateData,
        include: {
          bookings: {
            include: {
              customers: true
            }
          }
        }
      });
      
      res.json({
        success: true,
        data: invoice
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
      
      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
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
      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const outputPath = path.join(uploadDir, 'pdfs', filename);
      
      await generateInvoicePDF(invoice, companySettings, outputPath);
      
      // Update invoice with PDF path
      await prisma.invoices.update({
        where: { id },
        data: { pdfPath: outputPath }
      });
      
      res.json({
        success: true,
        data: {
          pdfPath: outputPath,
          downloadUrl: `/api/invoices/${id}/download`
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
      
      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice || !invoice.pdfPath) {
        res.status(404).json({
          success: false,
          error: 'PDF not found'
        });
        return;
      }
      
      res.download(invoice.pdfPath, `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Delete invoice
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if invoice has matched receipts (PAID or PARTIALLY_PAID)
      const invoice = await prisma.invoices.findUnique({
        where: { id },
        select: { status: true }
      });
      
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
        return;
      }
      
      if (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
        res.status(400).json({
          success: false,
          error: 'Cannot delete this invoice. It has matched payments. Please unmatch the receipts first.'
        });
        return;
      }
      
      await invoiceService.deleteInvoice(id);
      
      res.json({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const invoiceController = new InvoiceController();

