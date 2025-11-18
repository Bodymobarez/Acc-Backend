/**
 * Script to display cash registers info
 * Note: cash_registers table doesn't have accountId field in schema
 */

import { prisma } from './server/lib/prisma';

async function listCashRegisters() {
  console.log('📋 عرض معلومات الصناديق النقدية...\n');

  // Get all cash registers
  const registers = await prisma.cash_registers.findMany({
    orderBy: { currency: 'asc' }
  });

  if (registers.length === 0) {
    console.log('❌ No cash registers found');
    return;
  }

  console.log('✅ Cash Registers:');
  registers.forEach(r => {
    console.log(`\n   📦 ${r.name}`);
    console.log(`      Currency: ${r.currency}`);
    console.log(`      Balance: ${r.balance}`);
    console.log(`      Location: ${r.location || 'N/A'}`);
    console.log(`      Active: ${r.isActive ? 'Yes' : 'No'}`);
  });

  console.log(`\n📊 Total: ${registers.length} cash registers`);

  await prisma.$disconnect();
}

listCashRegisters()
  .then(() => console.log('\n✅ Done!'))
  .catch(err => console.error('❌ Error:', err));
