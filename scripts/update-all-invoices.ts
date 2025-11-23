import { prisma } from '../server/lib/prisma';

/**
 * Update all invoices from their bookings
 * This ensures VAT amounts are correctly reflected in invoices
 */
async function updateAllInvoices() {
  console.log('🔄 Starting invoice update process...\n');

  try {
    // Get all invoices with their bookings
    const invoices = await prisma.invoices.findMany({
      include: {
        bookings: true
      }
    });

    console.log(`📋 Found ${invoices.length} invoices to update\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      try {
        const booking = invoice.bookings;
        
        if (!booking) {
          console.log(`⚠️  Invoice ${invoice.invoiceNumber} - No booking found, skipping`);
          errorCount++;
          continue;
        }

        // Calculate invoice amounts based on booking
        let invoiceSubtotal: number;
        let invoiceVAT: number;
        let invoiceTotal: number;

        // 🎯 NEW LOGIC: VAT is calculated on PROFIT but NOT added to total
        // Total invoice = Sale amount (already includes everything)
        // VAT is saved for display/reporting purposes only
        
        invoiceVAT = booking.vatAmount || 0; // VAT calculated on profit
        invoiceSubtotal = booking.saleInAED - invoiceVAT; // Subtotal = Sale - VAT
        invoiceTotal = booking.saleInAED; // Total = Sale (customer pays this amount)

        // Update invoice
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
        successCount++;
      } catch (error: any) {
        console.error(`❌ Invoice ${invoice.invoiceNumber} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully updated: ${successCount} invoices`);
    console.log(`❌ Failed: ${errorCount} invoices`);
    console.log('='.repeat(50) + '\n');

    console.log('🎉 Invoice update process completed!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAllInvoices()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
