/**
 * Script to add Currency Gain and Loss accounts to Chart of Accounts
 */

import { prisma } from './server/lib/prisma';

async function addCurrencyAccounts() {
  console.log('💱 إضافة حسابات أرباح وخسائر العملات...\n');

  try {
    // Check if accounts already exist
    const existingGain = await prisma.accounts.findFirst({ where: { code: '4401' } });
    const existingLoss = await prisma.accounts.findFirst({ where: { code: '5501' } });

    if (existingGain && existingLoss) {
      console.log('✅ Currency accounts already exist:');
      console.log('   4401:', existingGain.name);
      console.log('   5501:', existingLoss.name);
      return;
    }

    // Get parent accounts
    const revenueParent = await prisma.accounts.findFirst({ where: { code: '4000' } }); // Other Revenue
    const expenseParent = await prisma.accounts.findFirst({ where: { code: '5000' } }); // Operating Expenses

    if (!revenueParent || !expenseParent) {
      console.error('❌ Parent accounts not found (4000, 5000)');
      return;
    }

    // Create Currency Gain account (Revenue)
    if (!existingGain) {
      await prisma.accounts.create({
        data: {
          id: crypto.randomUUID(),
          code: '4401',
          name: 'Currency Exchange Gains',
          nameAr: 'أرباح فروقات العملة',
          type: 'REVENUE',
          category: 'OTHER_REVENUE',
          parentId: revenueParent.id,
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          allowManualEntry: false, // Auto-generated only
          description: 'Gains from foreign currency exchange rate differences',
          updatedAt: new Date()
        }
      });
      console.log('✅ Created account: 4401 - Currency Exchange Gains');
    }

    // Create Currency Loss account (Expense)
    if (!existingLoss) {
      await prisma.accounts.create({
        data: {
          id: crypto.randomUUID(),
          code: '5501',
          name: 'Currency Exchange Losses',
          nameAr: 'خسائر فروقات العملة',
          type: 'EXPENSE',
          category: 'OPERATING_EXPENSE',
          parentId: expenseParent.id,
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          allowManualEntry: false, // Auto-generated only
          description: 'Losses from foreign currency exchange rate differences',
          updatedAt: new Date()
        }
      });
      console.log('✅ Created account: 5501 - Currency Exchange Losses');
    }

    console.log('\n✅ Currency accounts setup complete!');
    console.log('\n📋 Summary:');
    console.log('   4401 - Currency Exchange Gains (Revenue)');
    console.log('   5501 - Currency Exchange Losses (Expense)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCurrencyAccounts()
  .then(() => console.log('\n✅ Done!'))
  .catch(err => console.error('❌ Error:', err));
