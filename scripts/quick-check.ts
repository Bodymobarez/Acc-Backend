import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoices() {
  const invoices = await prisma.invoices.findMany({
    include: { bookings: true },
    orderBy: { invoiceNumber: 'desc' },
    take: 10
  });
  
  console.log('📊 Last 10 Invoices:\n');
  
  let correctCount = 0;
  let wrongCount = 0;
  
  for (const inv of invoices) {
    const b = inv.bookings as any;
    console.log(`${inv.invoiceNumber} | Service: ${b?.serviceType || 'N/A'} | UAE: ${b?.isUAEBooking ? 'Yes' : 'No'} | VAT Applicable: ${b?.vatApplicable ? 'Yes' : 'No'}`);
    console.log(`  Booking: Sale=${b?.saleInAED?.toFixed(2)}, VAT=${b?.vatAmount?.toFixed(2) || '0.00'}`);
    console.log(`  Invoice: Sub=${inv.subtotal.toFixed(2)}, VAT=${inv.vatAmount.toFixed(2)}, Total=${inv.totalAmount.toFixed(2)}`);
    
    let correct = false;
    
    // Check if correct
    if (b?.serviceType === 'FLIGHT') {
      correct = inv.vatAmount === 0 && Math.abs(inv.totalAmount - b.saleInAED) < 0.01;
      console.log(`  Status: ${correct ? '✅ CORRECT (FLIGHT)' : '❌ WRONG'}`);
    } else if (b?.vatApplicable) {
      if (b?.isUAEBooking) {
        // UAE: Total = Sale (VAT included)
        correct = Math.abs(inv.totalAmount - b.saleInAED) < 0.01;
        console.log(`  Status: ${correct ? '✅ CORRECT (UAE)' : `❌ WRONG - Should be Total=${b.saleInAED.toFixed(2)}`}`);
      } else {
        // Non-UAE: Total = Sale + VAT
        const expectedTotal = b.saleInAED + (b.vatAmount || 0);
        correct = Math.abs(inv.totalAmount - expectedTotal) < 0.01;
        console.log(`  Status: ${correct ? '✅ CORRECT (Non-UAE)' : `❌ WRONG - Should be Total=${expectedTotal.toFixed(2)}`}`);
      }
    } else {
      correct = inv.vatAmount === 0 && Math.abs(inv.totalAmount - b.saleInAED) < 0.01;
      console.log(`  Status: ${correct ? '✅ CORRECT (No VAT)' : '❌ WRONG'}`);
    }
    
    if (correct) correctCount++;
    else wrongCount++;
    
    console.log();
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Correct: ${correctCount}`);
  console.log(`❌ Wrong: ${wrongCount}`);
  
  await prisma.$disconnect();
}

checkInvoices().catch(console.error);
