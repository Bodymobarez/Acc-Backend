import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function fixVATCalculations() {
    console.log('🔧 Starting VAT calculation fix...\n');
    try {
        // Get all bookings with VAT applicable
        const bookings = await prisma.bookings.findMany({
            where: {
                vatApplicable: true
            }
        });
        console.log(`📊 Found ${bookings.length} bookings with VAT applicable\n`);
        let updatedBookings = 0;
        let updatedInvoices = 0;
        for (const booking of bookings) {
            console.log(`\n📦 Processing Booking: ${booking.bookingNumber}`);
            console.log(`   Is UAE Booking: ${booking.isUAEBooking}`);
            console.log(`   Sale Amount: ${booking.saleInAED}`);
            console.log(`   Cost Amount: ${booking.costInAED}`);
            console.log(`   OLD VAT Amount: ${booking.vatAmount}`);
            let newNetBeforeVAT;
            let newVATAmount;
            let newTotalWithVAT;
            let newGrossProfit;
            if (booking.isUAEBooking) {
                // UAE Booking: Sale amount includes VAT (reverse calculation)
                newNetBeforeVAT = booking.saleInAED / 1.05;
                newVATAmount = booking.saleInAED - newNetBeforeVAT;
                newTotalWithVAT = booking.saleInAED;
                newGrossProfit = newNetBeforeVAT - booking.costInAED;
                console.log(`   🔄 UAE Calculation:`);
                console.log(`      Net Before VAT: ${newNetBeforeVAT.toFixed(2)} (Sale ÷ 1.05)`);
                console.log(`      VAT Amount: ${newVATAmount.toFixed(2)} (Sale - Net)`);
                console.log(`      Gross Profit: ${newGrossProfit.toFixed(2)} (Net - Cost)`);
            }
            else {
                // Non-UAE: VAT is 5% on profit after commissions
                newNetBeforeVAT = booking.saleInAED;
                const grossProfit = booking.saleInAED - booking.costInAED;
                const profitAfterCommission = grossProfit - (booking.totalCommission || 0);
                newVATAmount = profitAfterCommission * 0.05;
                newTotalWithVAT = booking.saleInAED + newVATAmount;
                newGrossProfit = grossProfit;
                console.log(`   🔄 Non-UAE Calculation:`);
                console.log(`      Gross Profit: ${grossProfit.toFixed(2)}`);
                console.log(`      Total Commission: ${(booking.totalCommission || 0).toFixed(2)}`);
                console.log(`      Profit After Commission: ${profitAfterCommission.toFixed(2)}`);
                console.log(`      VAT Amount: ${newVATAmount.toFixed(2)} (5% of profit after commission)`);
            }
            // Calculate new net profit
            const newNetProfit = newGrossProfit - (booking.totalCommission || 0) - newVATAmount;
            console.log(`   NEW VAT Amount: ${newVATAmount.toFixed(2)}`);
            console.log(`   NEW Net Profit: ${newNetProfit.toFixed(2)}`);
            // Update booking
            await prisma.bookings.update({
                where: { id: booking.id },
                data: {
                    netBeforeVAT: parseFloat(newNetBeforeVAT.toFixed(2)),
                    vatAmount: parseFloat(newVATAmount.toFixed(2)),
                    totalWithVAT: parseFloat(newTotalWithVAT.toFixed(2)),
                    grossProfit: parseFloat(newGrossProfit.toFixed(2)),
                    netProfit: parseFloat(newNetProfit.toFixed(2)),
                    updatedAt: new Date()
                }
            });
            updatedBookings++;
            console.log(`   ✅ Booking updated`);
            // Update associated invoice if exists
            const invoices = await prisma.invoices.findMany({
                where: { bookingId: booking.id }
            });
            if (invoices && invoices.length > 0) {
                for (const invoice of invoices) {
                    console.log(`   📄 Updating Invoice: ${invoice.invoiceNumber}`);
                    await prisma.invoices.update({
                        where: { id: invoice.id },
                        data: {
                            subtotal: parseFloat(newNetBeforeVAT.toFixed(2)),
                            vatAmount: parseFloat(newVATAmount.toFixed(2)),
                            totalAmount: parseFloat(newTotalWithVAT.toFixed(2)),
                            updatedAt: new Date()
                        }
                    });
                    updatedInvoices++;
                    console.log(`   ✅ Invoice updated`);
                }
            }
        }
        console.log('\n\n✅ VAT Calculation Fix Completed!');
        console.log(`   Updated Bookings: ${updatedBookings}`);
        console.log(`   Updated Invoices: ${updatedInvoices}`);
    }
    catch (error) {
        console.error('❌ Error fixing VAT calculations:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the script
fixVATCalculations()
    .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
});
