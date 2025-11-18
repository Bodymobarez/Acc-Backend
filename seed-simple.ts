// Simple seed script for Cash Registers and Bank Accounts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Cash Registers and Bank Accounts...\n');

  // Cash Register AED
  const cashAED = await prisma.cash_registers.findFirst({
    where: { name: 'Main Cash AED' }
  });

  if (!cashAED) {
    await prisma.cash_registers.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Main Cash AED',
        currency: 'AED',
        balance: 0,
        location: 'Main Office',
        isActive: true,
        notes: 'Primary cash register for AED'
      }
    });
    console.log('✅ Created: Main Cash AED');
  } else {
    console.log('ℹ️  Main Cash AED exists');
  }

  // Cash Register USD
  const cashUSD = await prisma.cash_registers.findFirst({
    where: { name: 'Main Cash USD' }
  });

  if (!cashUSD) {
    await prisma.cash_registers.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Main Cash USD',
        currency: 'USD',
        balance: 0,
        location: 'Main Office',
        isActive: true,
        notes: 'Primary cash register for USD'
      }
    });
    console.log('✅ Created: Main Cash USD');
  } else {
    console.log('ℹ️  Main Cash USD exists');
  }

  // Mashreq Bank AED
  const mashreqAED = await prisma.bank_accounts.findFirst({
    where: { accountNumber: 'MASHREQ-AED-001' }
  });

  if (!mashreqAED) {
    await prisma.bank_accounts.create({
      data: {
        id: crypto.randomUUID(),
        accountNumber: 'MASHREQ-AED-001',
        accountName: 'Mashreq Bank AED',
        bankName: 'Mashreq Bank',
        currency: 'AED',
        balance: 0,
        accountType: 'BUSINESS',
        branch: 'Dubai Branch',
        isActive: true,
        notes: 'Mashreq account for AED'
      }
    });
    console.log('✅ Created: Mashreq Bank AED');
  } else {
    console.log('ℹ️  Mashreq Bank AED exists');
  }

  // Mashreq Bank USD
  const mashreqUSD = await prisma.bank_accounts.findFirst({
    where: { accountNumber: 'MASHREQ-USD-001' }
  });

  if (!mashreqUSD) {
    await prisma.bank_accounts.create({
      data: {
        id: crypto.randomUUID(),
        accountNumber: 'MASHREQ-USD-001',
        accountName: 'Mashreq Bank USD',
        bankName: 'Mashreq Bank',
        currency: 'USD',
        balance: 0,
        accountType: 'BUSINESS',
        branch: 'Dubai Branch',
        isActive: true,
        notes: 'Mashreq account for USD'
      }
    });
    console.log('✅ Created: Mashreq Bank USD');
  } else {
    console.log('ℹ️  Mashreq Bank USD exists');
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
