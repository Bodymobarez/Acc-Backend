import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedAccountsAndBanks() {
  console.log('🌱 Starting to seed Cash Registers and Bank Accounts...');

  try {
    // ============================================
    // 1. CASH REGISTERS
    // ============================================
    console.log('\n📦 Creating Cash Registers...');

    // Check if Main Cash AED exists
    const existingCashAED = await prisma.cash_registers.findFirst({
      where: { name: 'Main Cash AED', currency: 'AED' }
    });

    if (!existingCashAED) {
      await prisma.cash_registers.create({
        data: {
          id: randomUUID(),
          name: 'Main Cash AED',
          currency: 'AED',
          balance: 0,
          location: 'Main Office',
          isActive: true,
          notes: 'Primary cash register for AED transactions',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created: Main Cash AED');
    } else {
      console.log('ℹ️  Main Cash AED already exists');
    }

    // Check if Main Cash USD exists
    const existingCashUSD = await prisma.cash_registers.findFirst({
      where: { name: 'Main Cash USD', currency: 'USD' }
    });

    if (!existingCashUSD) {
      await prisma.cash_registers.create({
        data: {
          id: randomUUID(),
          name: 'Main Cash USD',
          currency: 'USD',
          balance: 0,
          location: 'Main Office',
          isActive: true,
          notes: 'Primary cash register for USD transactions',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created: Main Cash USD');
    } else {
      console.log('ℹ️  Main Cash USD already exists');
    }

    // ============================================
    // 2. BANK ACCOUNTS
    // ============================================
    console.log('\n🏦 Creating Bank Accounts...');

    // Check if Mashreq Bank AED exists
    const existingMashreqAED = await prisma.bank_accounts.findFirst({
      where: { accountNumber: 'MASHREQ-AED-001' }
    });

    if (!existingMashreqAED) {
      await prisma.bank_accounts.create({
        data: {
          id: randomUUID(),
          accountNumber: 'MASHREQ-AED-001',
          accountName: 'Mashreq Bank AED',
          bankName: 'Mashreq Bank',
          currency: 'AED',
          balance: 0,
          accountType: 'BUSINESS',
          branch: 'Dubai Main Branch',
          isActive: true,
          notes: 'Primary Mashreq account for AED transactions',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created: Mashreq Bank AED');
    } else {
      console.log('ℹ️  Mashreq Bank AED already exists');
    }

    // Check if Mashreq Bank USD exists
    const existingMashreqUSD = await prisma.bank_accounts.findFirst({
      where: { accountNumber: 'MASHREQ-USD-001' }
    });

    if (!existingMashreqUSD) {
      await prisma.bank_accounts.create({
        data: {
          id: randomUUID(),
          accountNumber: 'MASHREQ-USD-001',
          accountName: 'Mashreq Bank USD',
          bankName: 'Mashreq Bank',
          currency: 'USD',
          balance: 0,
          accountType: 'BUSINESS',
          branch: 'Dubai Main Branch',
          isActive: true,
          notes: 'Primary Mashreq account for USD transactions',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created: Mashreq Bank USD');
    } else {
      console.log('ℹ️  Mashreq Bank USD already exists');
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  Cash Registers: 2 (AED, USD)');
    console.log('  Bank Accounts: 2 (Mashreq AED, Mashreq USD)');
    console.log('\n💡 Notes:');
    console.log('  - Credit Card payments → Mashreq Bank AED');
    console.log('  - Check payments → Mashreq Bank AED (default)');
    console.log('  - Users can select specific accounts during payment');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAccountsAndBanks()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
