import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

export const cancellationService = {
  /**
   * Cancel booking and create refund booking
   * - Create refund booking with REFUNDED status (negative amounts)
   * - If invoice exists:
   *   - Cancel invoice
   *   - Add credit note info if invoice was PAID
   * - Change original booking status to CANCELLED
   */
  async cancelBookingWithRefund(bookingId: string, createdById: string) {
    console.log('\n🚫 ═══════════════════════════════════════');
    console.log('   BOOKING CANCELLATION PROCESS');
    console.log('═══════════════════════════════════════\n');

    // 1. Get original booking with all details
    const originalBooking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        customers: true,
        suppliers: true,
        booking_suppliers: {
          include: {
            suppliers: true
          }
        }
      }
    });

    if (!originalBooking) {
      throw new Error('Booking not found');
    }

    if (originalBooking.status === 'CANCELLED') {
      throw new Error('Booking is already cancelled');
    }

    console.log(`📋 Original Booking: ${originalBooking.bookingNumber}`);
    console.log(`💰 Sale Amount: ${originalBooking.saleInAED} AED`);
    console.log(`📅 Travel Date: ${originalBooking.travelDate}`);

    // 2. Check if invoice exists
    const invoice = await prisma.invoices.findFirst({
      where: { bookingId: bookingId }
    });

    let creditNoteInfo: any = null;

    if (invoice) {
      console.log(`\n📄 Invoice Found: ${invoice.invoiceNumber}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Amount: ${invoice.totalAmount} AED`);

      // Handle invoice based on payment status
      if (invoice.status === 'PAID') {
        console.log('\n💳 Invoice is PAID - Credit Note info will be added');
        
        creditNoteInfo = {
          amount: invoice.totalAmount,
          reason: `Cancellation of booking ${originalBooking.bookingNumber}`,
          customerId: invoice.customerId,
          invoiceNumber: invoice.invoiceNumber
        };

        // Update invoice with credit note info in notes
        await prisma.invoices.update({
          where: { id: invoice.id },
          data: { 
            status: 'CANCELLED',
            notes: `${invoice.notes || ''}

⚠️ CREDIT NOTE: ${invoice.totalAmount} AED issued due to cancellation.
Customer credit balance: ${invoice.totalAmount} AED
Original booking: ${originalBooking.bookingNumber}`,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Credit Note Info Added to Invoice`);
        console.log(`   Amount: ${invoice.totalAmount} AED`);
      } else {
        // Just cancel the invoice if not paid
        await prisma.invoices.update({
          where: { id: invoice.id },
          data: { 
            status: 'CANCELLED',
            notes: `${invoice.notes || ''}\n\nCancelled due to booking cancellation: ${originalBooking.bookingNumber}`,
            updatedAt: new Date()
          }
        });
      }

      console.log(`✅ Invoice Cancelled: ${invoice.invoiceNumber}`);
    }

    // 3. Create refund booking (mirror of original with negative amounts)
    console.log('\n🔄 Creating Refund Booking...');
    
    const lastBooking = await prisma.bookings.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const prefix = 'REFUND';
    const nextSequence = lastBooking ? 
      parseInt(lastBooking.bookingNumber.split('-').pop() || '0') + 1 : 1;
    const refundBookingNumber = `${prefix}-${new Date().getFullYear()}-${String(nextSequence).padStart(6, '0')}`;

    const refundBooking = await prisma.bookings.create({
      data: {
        id: randomUUID(),
        bookingNumber: refundBookingNumber,
        customerId: originalBooking.customerId,
        supplierId: originalBooking.supplierId,
        serviceType: originalBooking.serviceType,
        
        // Negative amounts for refund
        costAmount: -originalBooking.costAmount,
        costCurrency: originalBooking.costCurrency,
        costInAED: -originalBooking.costInAED,
        
        saleAmount: -originalBooking.saleAmount,
        saleCurrency: originalBooking.saleCurrency,
        saleInAED: -originalBooking.saleInAED,
        
        grossProfit: -originalBooking.grossProfit,
        netProfit: -originalBooking.netProfit,
        
        netBeforeVAT: -originalBooking.netBeforeVAT,
        vatAmount: -originalBooking.vatAmount,
        totalWithVAT: -originalBooking.totalWithVAT,
        
        isUAEBooking: originalBooking.isUAEBooking,
        vatApplicable: originalBooking.vatApplicable,
        
        // Commission (negative)
        bookingAgentId: originalBooking.bookingAgentId,
        agentCommissionRate: originalBooking.agentCommissionRate,
        agentCommissionAmount: originalBooking.agentCommissionAmount ? -originalBooking.agentCommissionAmount : 0,
        
        customerServiceId: originalBooking.customerServiceId,
        csCommissionRate: originalBooking.csCommissionRate,
        csCommissionAmount: originalBooking.csCommissionAmount ? -originalBooking.csCommissionAmount : 0,
        
        totalCommission: originalBooking.totalCommission ? -originalBooking.totalCommission : 0,
        
        // Service details
        serviceDetails: originalBooking.serviceDetails,
        travelDate: originalBooking.travelDate,
        returnDate: originalBooking.returnDate,
        
        notes: `🔴 REFUND for cancelled booking ${originalBooking.bookingNumber}
${creditNoteInfo ? `
💳 Credit Note issued: ${creditNoteInfo.amount} AED` : ''}

Original Notes:
${originalBooking.notes || 'N/A'}`,
        internalNotes: `System generated refund. Original booking: ${originalBooking.bookingNumber}${creditNoteInfo ? `\nCredit note amount: ${creditNoteInfo.amount} AED` : ''}`,
        
        status: 'REFUNDED',
        createdById,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    });

    console.log(`✅ Refund Booking Created: ${refundBookingNumber}`);
    console.log(`   Sale Amount (Negative): ${refundBooking.saleInAED} AED`);

    // 4. Create refund booking for multi-suppliers if exists
    if (originalBooking.booking_suppliers && originalBooking.booking_suppliers.length > 0) {
      console.log(`\n📦 Creating Refund for ${originalBooking.booking_suppliers.length} Additional Suppliers...`);
      
      for (const supplier of originalBooking.booking_suppliers) {
        await prisma.booking_suppliers.create({
          data: {
            id: randomUUID(),
            bookingId: refundBooking.id,
            supplierId: supplier.supplierId,
            serviceType: supplier.serviceType,
            costAmount: -supplier.costAmount,
            costCurrency: supplier.costCurrency,
            costInAED: -supplier.costInAED,
            description: `🔴 REFUND: ${supplier.description || ''}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        });
        console.log(`   ✅ Refund supplier: ${supplier.suppliers?.companyName}`);
      }
    }

    // 5. Update original booking status to CANCELLED
    await prisma.bookings.update({
      where: { id: bookingId },
      data: { 
        status: 'CANCELLED',
        internalNotes: `${originalBooking.internalNotes || ''}\n\n🚫 CANCELLED - Refund booking: ${refundBookingNumber}${creditNoteInfo ? `\nCredit note: ${creditNoteInfo.amount} AED` : ''}`,
        updatedAt: new Date()
      }
    });

    console.log(`\n✅ Original Booking Status Updated: CANCELLED`);

    console.log('\n🎉 ═══════════════════════════════════════');
    console.log('   CANCELLATION COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════\n');

    return {
      originalBooking,
      refundBooking,
      invoice,
      creditNoteInfo,
      message: 'Booking cancelled successfully with refund booking created'
    };
  }
};
