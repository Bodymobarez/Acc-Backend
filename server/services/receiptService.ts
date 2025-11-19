import { randomUUID } from 'crypto';
import { accountingService } from './accountingService';
import { prisma } from '../lib/prisma';

interface CreateReceiptInput {
  receiptNumber: string;
  customerId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  bankAccountId?: string;
  supplierId?: string;
  checkNumber?: string;
  reference?: string;
  receiptDate?: string;
  notes?: string;
  createdById?: string;
}

interface UpdateReceiptInput {
  amount?: number;
  paymentMethod?: string;
  bankAccountId?: string;
  checkNumber?: string;
  reference?: string;
  receiptDate?: string;
  notes?: string;
  status?: string;
}

export const receiptService = {
  // Create new receipt
  async createReceipt(input: CreateReceiptInput) {

    const receipt = await prisma.receipts.create({
      data: {
        id: randomUUID(),
        receiptNumber: input.receiptNumber,
        customerId: input.customerId,
        invoiceId: input.invoiceId || null,
        amount: input.amount,
        paymentMethod: input.paymentMethod.toUpperCase(),
        bankAccountId: input.bankAccountId || null,
        supplierId: input.supplierId || null,
        checkNumber: input.checkNumber || null,
        reference: input.reference || null,
        receiptDate: input.receiptDate ? new Date(input.receiptDate) : new Date(),
        notes: input.notes || null,
        status: 'COMPLETED',
        matchingStatus: (input as any).matchingStatus || 'NOT_MATCHED', // Add matching status
        matchedAmount: (input as any).matchedAmount || 0, // Add matched amount
        createdById: input.createdById || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      include: {
        customers: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    // Create accounting journal entry
    await accountingService.createReceiptJournalEntry(receipt);

    // If receipt is linked to an invoice, auto-update invoice status
    if (input.invoiceId) {
      // Get invoice details
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
        select: { totalAmount: true, paidAmount: true }
      });
      
      if (invoice) {
        // Calculate new paid amount
        const newPaidAmount = (invoice.paidAmount || 0) + input.amount;
        
        // Use epsilon for floating-point comparison (allow 0.01 difference)
        const epsilon = 0.01;
        const difference = invoice.totalAmount - newPaidAmount;
        
        // Determine new status based on payments
        let newStatus = 'UNPAID';
        if (Math.abs(difference) < epsilon || newPaidAmount >= invoice.totalAmount) {
          // Fully paid (within epsilon tolerance)
          newStatus = 'PAID';
        } else if (newPaidAmount > 0) {
          // Partially paid
          newStatus = 'PARTIALLY_PAID';
        }
        
        console.log(`✅ Auto-updating invoice status:`);
        console.log(`   Invoice Amount: ${invoice.totalAmount}`);
        console.log(`   Previous Paid: ${invoice.paidAmount || 0}`);
        console.log(`   Payment Amount: ${input.amount}`);
        console.log(`   New Total Paid: ${newPaidAmount}`);
        console.log(`   Difference: ${difference}`);
        console.log(`   New Status: ${newStatus}`);
        
        // Update invoice status and paid amount
        await prisma.invoices.update({
          where: { id: input.invoiceId },
          data: { 
            status: newStatus,
            paidAmount: newPaidAmount,
            updatedAt: new Date()
          },
        });
        
        // If invoice is fully paid, update booking status to COMPLETE
        if (newStatus === 'PAID') {
          const invoiceWithBooking = await prisma.invoices.findUnique({
            where: { id: input.invoiceId },
            select: { bookingId: true }
          });
          
          if (invoiceWithBooking?.bookingId) {
            await prisma.bookings.update({
              where: { id: invoiceWithBooking.bookingId },
              data: { 
                status: 'COMPLETE',
                updatedAt: new Date()
              }
            });
            console.log(`✅ Booking status updated to COMPLETE`);
          }
        }
      }
    }

    return receipt;
  },

  // Get all receipts
  async getAllReceipts(filters?: any) {

    const where: any = {};

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.startDate || filters?.endDate) {
      where.receiptDate = {};
      if (filters.startDate) {
        where.receiptDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.receiptDate.lte = new Date(filters.endDate);
      }
    }

    const receipts = await prisma.receipts.findMany({
      where,
      include: {
        customers: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: {
        receiptDate: 'desc',
      },
    });

    return receipts;
  },

  // Get receipt by ID
  async getReceiptById(id: string) {

    const receipt = await prisma.receipts.findUnique({
      where: { id },
      include: {
        customers: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    return receipt;
  },

  // Update receipt
  async updateReceipt(id: string, input: UpdateReceiptInput) {

    const receipt = await prisma.receipts.update({
      where: { id },
      data: {
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.paymentMethod && { paymentMethod: input.paymentMethod.toUpperCase() }),
        ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
        ...(input.checkNumber !== undefined && { checkNumber: input.checkNumber }),
        ...(input.reference !== undefined && { reference: input.reference }),
        ...(input.receiptDate && { receiptDate: new Date(input.receiptDate) }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status && { status: input.status.toUpperCase() }),
        ...((input as any).matchingStatus && { matchingStatus: (input as any).matchingStatus }),
        ...((input as any).matchedAmount !== undefined && { matchedAmount: (input as any).matchedAmount }),
        ...((input as any).invoiceId !== undefined && { invoiceId: (input as any).invoiceId }),
      },
      include: {
        customers: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    // If receipt is linked to an invoice, auto-update invoice status
    if ((input as any).invoiceId) {
      const invoiceId = (input as any).invoiceId;
      
      // Get invoice details
      const invoice = await prisma.invoices.findUnique({
        where: { id: invoiceId },
        select: { totalAmount: true }
      });
      
      if (invoice) {
        // Calculate total paid amount from ALL receipts linked to this invoice
        const allReceipts = await prisma.receipts.findMany({
          where: {
            invoiceId: invoiceId,
            status: { not: 'CANCELLED' }
          }
        });
        
        const totalPaid = allReceipts.reduce((sum, r) => sum + r.amount, 0);
        
        // Use epsilon for floating-point comparison (allow 0.01 difference)
        const epsilon = 0.01;
        const difference = invoice.totalAmount - totalPaid;
        
        // Determine new status based on total payments
        let newStatus = 'UNPAID';
        if (Math.abs(difference) < epsilon || totalPaid >= invoice.totalAmount) {
          // Fully paid (within epsilon tolerance)
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          // Partially paid
          newStatus = 'PARTIALLY_PAID';
        }
        
        console.log(`✅ Auto-updating invoice status:`);
        console.log(`   Invoice Amount: ${invoice.totalAmount}`);
        console.log(`   Total Paid: ${totalPaid}`);
        console.log(`   Difference: ${difference}`);
        console.log(`   New Status: ${newStatus}`);
        
        // Update invoice status
        await prisma.invoices.update({
          where: { id: invoiceId },
          data: { status: newStatus },
        });
        
        // If invoice is fully paid, update booking status to COMPLETE
        if (newStatus === 'PAID') {
          const invoiceWithBooking = await prisma.invoices.findUnique({
            where: { id: invoiceId },
            select: { bookingId: true }
          });
          
          if (invoiceWithBooking?.bookingId) {
            await prisma.bookings.update({
              where: { id: invoiceWithBooking.bookingId },
              data: { 
                status: 'COMPLETE',
                updatedAt: new Date()
              }
            });
            console.log(`✅ Booking status updated to COMPLETE`);
          }
        }
      }
    }

    return receipt;
  },

  // Delete receipt
  async deleteReceipt(id: string) {

    // First, get the receipt to check if it's linked to an invoice
    const receipt = await prisma.receipts.findUnique({
      where: { id },
      select: { invoiceId: true, amount: true },
    });

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // Delete the receipt first
    await prisma.receipts.delete({
      where: { id },
    });

    // If receipt was linked to an invoice, recalculate invoice status
    if (receipt.invoiceId) {
      // Get invoice details
      const invoice = await prisma.invoices.findUnique({
        where: { id: receipt.invoiceId },
        select: { totalAmount: true }
      });
      
      if (invoice) {
        // Calculate remaining paid amount from other receipts
        const remainingReceipts = await prisma.receipts.findMany({
          where: {
            invoiceId: receipt.invoiceId,
            status: { not: 'CANCELLED' }
          }
        });
        
        const totalPaid = remainingReceipts.reduce((sum, r) => sum + r.amount, 0);
        
        // Use epsilon for floating-point comparison
        const epsilon = 0.01;
        const difference = invoice.totalAmount - totalPaid;
        
        // Determine new status based on remaining payments
        let newStatus = 'UNPAID';
        if (Math.abs(difference) < epsilon || totalPaid >= invoice.totalAmount) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIALLY_PAID';
        }
        
        // Update invoice status
        await prisma.invoices.update({
          where: { id: receipt.invoiceId },
          data: { status: newStatus },
        });
        
        // If invoice is no longer fully paid, revert booking status from COMPLETE
        if (newStatus !== 'PAID') {
          const invoiceWithBooking = await prisma.invoices.findUnique({
            where: { id: receipt.invoiceId },
            select: { bookingId: true }
          });
          
          if (invoiceWithBooking?.bookingId) {
            // Check current booking status
            const booking = await prisma.bookings.findUnique({
              where: { id: invoiceWithBooking.bookingId },
              select: { status: true }
            });
            
            // Only revert if booking is COMPLETE
            if (booking?.status === 'COMPLETE') {
              await prisma.bookings.update({
                where: { id: invoiceWithBooking.bookingId },
                data: { 
                  status: 'CONFIRMED',
                  updatedAt: new Date()
                }
              });
              console.log(`⚠️ Booking status reverted to CONFIRMED (receipt deleted)`);
            }
          }
        }
      }
    }

    return { 
      success: true, 
      message: 'Receipt deleted successfully',
      invoiceReverted: !!receipt.invoiceId,
    };
  },

  // Get receipts by customer
  async getReceiptsByCustomer(customerId: string) {

    const receipts = await prisma.receipts.findMany({
      where: { customerId },
      orderBy: {
        receiptDate: 'desc',
      },
    });

    return receipts;
  },

  // Get receipts by invoice
  async getReceiptsByInvoice(invoiceId: string) {

    const receipts = await prisma.receipts.findMany({
      where: { invoiceId },
      orderBy: {
        receiptDate: 'desc',
      },
    });

    return receipts;
  },

  // Generate receipt number
  async generateReceiptNumber() {

    const year = new Date().getFullYear();
    const count = await prisma.receipts.count({
      where: {
        receiptNumber: {
          startsWith: `REC-${year}`,
        },
      },
    });

    return `REC-${year}-${String(count + 1).padStart(4, '0')}`;
  },
};
