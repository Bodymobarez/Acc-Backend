import { randomUUID } from 'crypto';
import { generateInvoiceNumber } from '../utils/calculations';
import { accountingService } from './accountingService';
import { prisma } from '../lib/prisma';
export class InvoiceService {
    /**
     * Create invoice from booking
     */
    async createInvoice(input) {
        const booking = await prisma.bookings.findUnique({
            where: { id: input.bookingId },
            include: { customers: true }
        });
        if (!booking) {
            throw new Error('Booking not found');
        }
        // Check if invoice already exists
        const existing = await prisma.invoices.findUnique({
            where: { bookingId: input.bookingId }
        });
        if (existing) {
            throw new Error('Invoice already exists for this booking');
        }
        // Generate invoice number
        const lastInvoice = await prisma.invoices.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        const settings = await prisma.company_settings.findFirst();
        const prefix = settings?.invoicePrefix || 'INV';
        const nextSequence = lastInvoice ?
            parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') + 1 : 1;
        const invoiceNumber = generateInvoiceNumber(prefix, nextSequence);
        // Create invoice - ALWAYS use AED amounts
        // For FLIGHT bookings: NO VAT in invoice (VAT is internal on profit only)
        let invoiceSubtotal;
        let invoiceVAT;
        let invoiceTotal;
        if (booking.serviceType === 'FLIGHT') {
            // FLIGHT: Invoice shows sale amount only, NO VAT
            invoiceSubtotal = booking.saleInAED;
            invoiceVAT = 0;
            invoiceTotal = booking.saleInAED;
        }
        else {
            // Other services: Calculate VAT properly
            // If booking has VAT applicable and is UAE booking
            if (booking.vatApplicable && booking.isUAEBooking) {
                // Sale amount INCLUDES VAT (5%)
                // Calculate: Subtotal = Sale / 1.05, VAT = Sale - Subtotal
                invoiceSubtotal = booking.saleInAED / 1.05;
                invoiceVAT = booking.saleInAED - invoiceSubtotal;
                invoiceTotal = booking.saleInAED;
            }
            else {
                // No VAT applicable or non-UAE booking
                invoiceSubtotal = booking.saleInAED;
                invoiceVAT = 0;
                invoiceTotal = booking.saleInAED;
            }
        }
        const invoice = await prisma.invoices.create({
            data: {
                id: randomUUID(),
                invoiceNumber,
                bookingId: input.bookingId,
                customerId: booking.customerId,
                subtotal: invoiceSubtotal,
                vatAmount: invoiceVAT,
                totalAmount: invoiceTotal,
                currency: 'AED', // ALWAYS AED
                dueDate: input.dueDate,
                notes: input.notes,
                termsConditions: input.termsConditions || settings?.invoiceTerms || undefined,
                createdById: input.createdById,
                status: 'UNPAID',
                updatedAt: new Date()
            },
            include: {
                bookings: {
                    include: {
                        suppliers: true
                    }
                },
                customers: true,
                users: true
            }
        });
        // Update booking status to CONFIRMED when invoice is generated
        await prisma.bookings.update({
            where: { id: input.bookingId },
            data: {
                status: 'CONFIRMED',
                updatedAt: new Date()
            }
        });
        // Create accounting journal entry
        await accountingService.createInvoiceJournalEntry(invoice);
        return invoice;
    }
    /**
     * Get invoice by ID
     */
    async getInvoiceById(id) {
        return await prisma.invoices.findUnique({
            where: { id },
            include: {
                bookings: {
                    include: {
                        suppliers: true,
                        customers: true
                    }
                },
                customers: true,
                users: true
            }
        });
    }
    /**
     * Get all invoices with filters
     */
    async getInvoices(filters) {
        const invoices = await prisma.invoices.findMany({
            where: {
                ...(filters.status && { status: filters.status }),
                ...(filters.customerId && { customerId: filters.customerId }),
                ...(filters.startDate && filters.endDate && {
                    invoiceDate: {
                        gte: filters.startDate,
                        lte: filters.endDate
                    }
                })
            },
            include: {
                customers: true,
                bookings: {
                    include: {
                        customers: true,
                        suppliers: true
                    }
                },
                users: true
            },
            orderBy: {
                invoiceDate: 'desc'
            }
        });
        // Calculate paidAmount for each invoice from linked receipts
        const invoicesWithPaidAmount = await Promise.all(invoices.map(async (invoice) => {
            // Get all receipts linked to this invoice
            const receipts = await prisma.receipts.findMany({
                where: {
                    invoiceId: invoice.id,
                    status: { not: 'CANCELLED' }
                }
            });
            const paidAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
            return {
                ...invoice,
                paidAmount
            };
        }));
        return invoicesWithPaidAmount;
    }
    /**
     * Update invoice status
     */
    async updateInvoiceStatus(id, status, paidDate) {
        return await prisma.invoices.update({
            where: { id },
            data: {
                status,
                ...(status === 'PAID' && paidDate && { paidDate }),
                updatedAt: new Date()
            }
        });
    }
    /**
     * Update invoice
     */
    async updateInvoice(id, data) {
        return await prisma.invoices.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }
    /**
     * Delete invoice
     */
    async deleteInvoice(id) {
        const invoice = await prisma.invoices.findUnique({
            where: { id }
        });
        if (invoice) {
            // Update booking status back to confirmed
            await prisma.bookings.update({
                where: { id: invoice.bookingId },
                data: {
                    status: 'CONFIRMED',
                    updatedAt: new Date()
                }
            });
        }
        return await prisma.invoices.delete({
            where: { id }
        });
    }
}
export const invoiceService = new InvoiceService();
