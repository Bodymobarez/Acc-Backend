import { prisma } from '../lib/prisma';

/**
 * Relationship Verification Service
 * Ensures all relationships between bookings, invoices, and receipts work correctly
 */

export class RelationshipService {
  /**
   * Verify booking can generate invoice
   * Returns validation result and any issues
   */
  async verifyBookingToInvoiceRelationship(bookingId: string): Promise<{
    valid: boolean;
    booking: any;
    existingInvoice: any;
    canCreateInvoice: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Fetch booking with all relations
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        customers: true,
        suppliers: true,
        users: true,
        invoices: true
      }
    });

    if (!booking) {
      return {
        valid: false,
        booking: null,
        existingInvoice: null,
        canCreateInvoice: false,
        issues: ['Booking not found']
      };
    }

    // Check if invoice already exists
    const existingInvoice = booking.invoices;

    if (existingInvoice) {
      issues.push(`Invoice already exists: ${existingInvoice.invoiceNumber}`);
    }

    // Validate booking has required data
    if (!booking.customerId) {
      issues.push('Booking missing customer');
    }

    if (!booking.saleInAED || booking.saleInAED <= 0) {
      issues.push('Booking has invalid sale amount');
    }

    return {
      valid: issues.length === 0,
      booking,
      existingInvoice: existingInvoice || null,
      canCreateInvoice: !existingInvoice && issues.length === 0,
      issues
    };
  }

  /**
   * Verify invoice can receive payments
   * Returns validation result and payment status
   */
  async verifyInvoiceToReceiptRelationship(invoiceId: string): Promise<{
    valid: boolean;
    invoice: any;
    receipts: any[];
    totalPaid: number;
    remainingAmount: number;
    status: string;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Fetch invoice with all relations
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        bookings: {
          include: {
            customers: true,
            suppliers: true
          }
        },
        customers: true,
        users: true
      }
    });

    if (!invoice) {
      return {
        valid: false,
        invoice: null,
        receipts: [],
        totalPaid: 0,
        remainingAmount: 0,
        status: 'NOT_FOUND',
        issues: ['Invoice not found']
      };
    }

    // Fetch all receipts linked to this invoice
    const receipts = await prisma.receipts.findMany({
      where: {
        invoiceId: invoiceId,
        status: { not: 'CANCELLED' }
      },
      include: {
        customers: true
      }
    });

    // Calculate total paid
    const totalPaid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const remainingAmount = invoice.totalAmount - totalPaid;

    // Determine status
    let status = 'UNPAID';
    const epsilon = 0.01;
    if (Math.abs(remainingAmount) < epsilon || totalPaid >= invoice.totalAmount) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    // Check if status matches database
    if (invoice.status !== status) {
      issues.push(`Invoice status mismatch: DB says ${invoice.status}, calculated ${status}`);
    }

    return {
      valid: issues.length === 0,
      invoice,
      receipts,
      totalPaid,
      remainingAmount,
      status,
      issues
    };
  }

  /**
   * Verify receipt matching to invoice
   * Ensures receipt-invoice relationship is correct
   */
  async verifyReceiptMatching(receiptId: string): Promise<{
    valid: boolean;
    receipt: any;
    matchedInvoice: any;
    matchingCorrect: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Fetch receipt
    const receipt = await prisma.receipts.findUnique({
      where: { id: receiptId },
      include: {
        customers: true
      }
    });

    if (!receipt) {
      return {
        valid: false,
        receipt: null,
        matchedInvoice: null,
        matchingCorrect: false,
        issues: ['Receipt not found']
      };
    }

    let matchedInvoice = null;
    let matchingCorrect = true;

    // If receipt is linked to invoice
    if (receipt.invoiceId) {
      matchedInvoice = await prisma.invoices.findUnique({
        where: { id: receipt.invoiceId },
        include: {
          bookings: true,
          customers: true
        }
      });

      if (!matchedInvoice) {
        issues.push('Receipt linked to non-existent invoice');
        matchingCorrect = false;
      } else {
        // Verify customer matches
        if (matchedInvoice.customerId !== receipt.customerId) {
          issues.push('Receipt customer does not match invoice customer');
          matchingCorrect = false;
        }

        // Verify amount is not greater than invoice total
        if (receipt.amount > matchedInvoice.totalAmount) {
          issues.push('Receipt amount exceeds invoice total');
        }
      }
    }

    return {
      valid: issues.length === 0,
      receipt,
      matchedInvoice,
      matchingCorrect,
      issues
    };
  }

  /**
   * Get complete transaction flow for a booking
   * Shows full relationship chain: Booking → Invoice → Receipts
   */
  async getCompleteTransactionFlow(bookingId: string): Promise<{
    booking: any;
    invoice: any;
    receipts: any[];
    journalEntries: any[];
    status: {
      bookingStatus: string;
      invoiceStatus: string;
      paymentStatus: string;
      fullyPaid: boolean;
    };
    financial: {
      bookingTotal: number;
      invoiceTotal: number;
      totalPaid: number;
      remainingBalance: number;
    };
  }> {
    // Fetch booking
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        customers: true,
        suppliers: true,
        users: true,
        invoices: true,
        employees_bookings_bookingAgentIdToemployees: {
          include: { users: true }
        },
        employees_bookings_customerServiceIdToemployees: {
          include: { users: true }
        }
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const invoice = booking.invoices || null;
    let receipts: any[] = [];
    let totalPaid = 0;

    if (invoice) {
      receipts = await prisma.receipts.findMany({
        where: {
          invoiceId: invoice.id,
          status: { not: 'CANCELLED' }
        },
        include: {
          customers: true
        },
        orderBy: {
          receiptDate: 'desc'
        }
      });

      totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);
    }

    // Fetch related journal entries
    const journalEntries = await prisma.journal_entries.findMany({
      where: {
        OR: [
          { bookingId: bookingId },
          ...(invoice ? [{ invoiceId: invoice.id }] : [])
        ]
      },
      include: {
        accounts_journal_entries_debitAccountIdToaccounts: true,
        accounts_journal_entries_creditAccountIdToaccounts: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    const bookingTotal = booking.totalWithVAT || booking.saleInAED;
    const invoiceTotal = invoice?.totalAmount || 0;
    const remainingBalance = invoiceTotal - totalPaid;
    const epsilon = 0.01;
    const fullyPaid = Math.abs(remainingBalance) < epsilon || totalPaid >= invoiceTotal;

    return {
      booking,
      invoice,
      receipts,
      journalEntries,
      status: {
        bookingStatus: booking.status,
        invoiceStatus: invoice?.status || 'NO_INVOICE',
        paymentStatus: fullyPaid ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        fullyPaid
      },
      financial: {
        bookingTotal,
        invoiceTotal,
        totalPaid,
        remainingBalance
      }
    };
  }

  /**
   * Synchronize invoice status with receipt payments
   * Ensures invoice status matches actual payments
   */
  async synchronizeInvoiceStatus(invoiceId: string): Promise<{
    updated: boolean;
    oldStatus: string;
    newStatus: string;
    totalPaid: number;
  }> {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const receipts = await prisma.receipts.findMany({
      where: {
        invoiceId: invoiceId,
        status: { not: 'CANCELLED' }
      }
    });

    const totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);
    const epsilon = 0.01;
    const difference = invoice.totalAmount - totalPaid;

    let newStatus = 'UNPAID';
    if (Math.abs(difference) < epsilon || totalPaid >= invoice.totalAmount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const oldStatus = invoice.status;
    const updated = oldStatus !== newStatus;

    if (updated) {
      await prisma.invoices.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          ...(newStatus === 'PAID' && !invoice.paidDate ? { paidDate: new Date() } : {})
        }
      });
    }

    return {
      updated,
      oldStatus,
      newStatus,
      totalPaid
    };
  }
}

export const relationshipService = new RelationshipService();
