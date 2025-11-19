import { prisma } from '../server/lib/prisma';
import { calculateVAT, calculateCommissions, calculateVATOnProfit, convertToAED } from '../server/utils/calculations';

/**
 * Recalculate and update all bookings with correct VAT amounts
 * This ensures VAT is properly calculated based on current business rules
 */
async function updateAllBookings() {
  console.log('🔄 Starting booking update process...\n');

  try {
    // Get all bookings
    const bookings = await prisma.bookings.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 Found ${bookings.length} bookings to update\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      try {
        // Skip if no amounts
        if (!booking.costInAED || !booking.saleInAED) {
          console.log(`⚠️  Booking ${booking.bookingNumber} - Missing amounts, skipping`);
          skippedCount++;
          continue;
        }

        const isUAEBooking = booking.isUAEBooking ?? true;
        const vatApplicable = booking.vatApplicable ?? true;

        // Recalculate VAT
        const vatCalc = vatApplicable
          ? calculateVAT(booking.saleInAED, booking.costInAED, isUAEBooking, 5.0, booking.serviceType)
          : {
              isUAEBooking,
              saleAmount: booking.saleInAED,
              costAmount: booking.costInAED,
              netBeforeVAT: booking.saleInAED,
              vatAmount: 0,
              totalWithVAT: booking.saleInAED,
              grossProfit: booking.saleInAED - booking.costInAED,
              netProfit: booking.saleInAED - booking.costInAED
            };

        // Recalculate commissions
        const agentCommissionRate = booking.agentCommissionRate || 0;
        const csCommissionRate = booking.csCommissionRate || 0;

        const commissionCalc = calculateCommissions(
          vatCalc.grossProfit,
          agentCommissionRate,
          csCommissionRate
        );

        // Calculate final VAT and net profit
        let finalVatAmount: number;
        let finalNetProfit: number;

        if (isUAEBooking && vatApplicable) {
          // UAE Booking: VAT already extracted from total
          finalVatAmount = vatCalc.vatAmount;
          finalNetProfit = commissionCalc.profitAfterCommission;
        } else if (!isUAEBooking && vatApplicable) {
          // Non-UAE with VAT: VAT is 5% on profit after commissions
          finalVatAmount = calculateVATOnProfit(commissionCalc.profitAfterCommission);
          finalNetProfit = commissionCalc.profitAfterCommission - finalVatAmount;
        } else {
          // No VAT
          finalVatAmount = 0;
          finalNetProfit = commissionCalc.profitAfterCommission;
        }

        // Update booking
        await prisma.bookings.update({
          where: { id: booking.id },
          data: {
            netBeforeVAT: isUAEBooking ? vatCalc.netBeforeVAT : booking.saleInAED,
            vatAmount: finalVatAmount,
            totalWithVAT: isUAEBooking ? booking.saleInAED : booking.saleInAED + finalVatAmount,
            grossProfit: vatCalc.grossProfit,
            netProfit: finalNetProfit,
            agentCommissionAmount: commissionCalc.agentCommissionAmount,
            csCommissionAmount: commissionCalc.csCommissionAmount,
            totalCommission: commissionCalc.totalCommission,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Booking ${booking.bookingNumber} - Updated (VAT: ${finalVatAmount.toFixed(2)} AED, Service: ${booking.serviceType}, UAE: ${isUAEBooking}, Applicable: ${vatApplicable})`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Booking ${booking.bookingNumber} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully updated: ${successCount} bookings`);
    console.log(`⚠️  Skipped: ${skippedCount} bookings`);
    console.log(`❌ Failed: ${errorCount} bookings`);
    console.log('='.repeat(80) + '\n');

    // Now update all invoices from updated bookings
    console.log('📝 Now updating invoices from bookings...\n');
    
    const invoices = await prisma.invoices.findMany({
      include: {
        bookings: true
      }
    });

    let invoiceSuccessCount = 0;
    let invoiceErrorCount = 0;

    for (const invoice of invoices) {
      try {
        const booking = invoice.bookings;
        
        if (!booking) {
          console.log(`⚠️  Invoice ${invoice.invoiceNumber} - No booking found, skipping`);
          invoiceErrorCount++;
          continue;
        }

        // Calculate invoice amounts based on updated booking
        let invoiceSubtotal: number;
        let invoiceVAT: number;
        let invoiceTotal: number;

        if (booking.serviceType === 'FLIGHT') {
          invoiceSubtotal = booking.saleInAED;
          invoiceVAT = 0;
          invoiceTotal = booking.saleInAED;
        } else {
          invoiceVAT = booking.vatAmount || 0;

          if (invoiceVAT > 0) {
            invoiceSubtotal = booking.saleInAED - invoiceVAT;
            invoiceTotal = booking.saleInAED;
          } else {
            invoiceSubtotal = booking.saleInAED;
            invoiceTotal = booking.saleInAED;
          }
        }

        await prisma.invoices.update({
          where: { id: invoice.id },
          data: {
            subtotal: invoiceSubtotal,
            vatAmount: invoiceVAT,
            totalAmount: invoiceTotal,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Invoice ${invoice.invoiceNumber} - Updated (VAT: ${invoiceVAT.toFixed(2)} AED)`);
        invoiceSuccessCount++;
      } catch (error: any) {
        console.error(`❌ Invoice ${invoice.invoiceNumber} - Error: ${error.message}`);
        invoiceErrorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully updated invoices: ${invoiceSuccessCount}`);
    console.log(`❌ Failed invoices: ${invoiceErrorCount}`);
    console.log('='.repeat(80) + '\n');

    console.log('🎉 Complete update process finished!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAllBookings()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
