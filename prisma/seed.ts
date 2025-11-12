import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Create Company Settings
  console.log('📝 Creating company settings...');
  const companySettingsId = randomUUID();
  const companySettings = await prisma.company_settings.upsert({
    where: { id: companySettingsId },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: companySettingsId,
      companyName: 'B-Desk Travel',
      companyNameArabic: 'بي ديسك للسياحة',
      tradeLicense: 'TL-789456',
      taxRegistrationNo: '100456789700003',
      addressLine1: 'Business Bay, Dubai',
      city: 'Dubai',
      country: 'United Arab Emirates',
      phone: '+971 4 567 8901',
      email: 'info@bdesktravel.com',
      website: 'www.bdesktravel.com',
      defaultCurrency: 'AED',
      vatRate: 5.0,
      vatEnabled: true,
      invoicePrefix: 'INV',
      filePrefix: 'FILE',
      invoiceTerms: 'Payment is due within 30 days from invoice date.',
      invoiceFooter: 'Thank you for your business!',
      updatedAt: new Date()
    }
  });
  console.log('✅ Company settings created');
  
  // Create Currencies
  console.log('💱 Creating currencies...');
  const currencies = [
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', exchangeRateToAED: 1 },
    { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRateToAED: 3.67 },
    { code: 'EUR', name: 'Euro', symbol: '€', exchangeRateToAED: 4.02 },
    { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRateToAED: 4.68 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', exchangeRateToAED: 0.98 }
  ];
  
  for (const currency of currencies) {
    await prisma.currencies.upsert({
      where: { code: currency.code },
      update: {
        ...currency,
        lastUpdated: new Date()
      },
      create: {
        id: randomUUID(),
        ...currency,
        lastUpdated: new Date()
      }
    });
  }
  console.log('✅ Currencies created');
  
  // Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('Body@2017', 10);
  
  const admin = await prisma.users.upsert({
    where: { email: 'ceo@bdesktravel.com' },
    update: {
      username: 'yasser',
      password: hashedPassword,
      firstName: 'Yasser',
      lastName: 'Mobarez',
      role: 'ADMIN',
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      username: 'yasser',
      email: 'ceo@bdesktravel.com',
      password: hashedPassword,
      firstName: 'Yasser',
      lastName: 'Mobarez',
      role: 'ADMIN',
      permissions: '{}',
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('✅ Admin user created (Username: Yasser / Password: Body@2017)');
  
  // Create Sample Users
  console.log('👥 Creating sample users...');
  
  const accountant = await prisma.users.upsert({
    where: { email: 'accountant@tourism.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      username: 'accountant',
      email: 'accountant@tourism.com',
      password: await bcrypt.hash('accountant123', 10),
      firstName: 'John',
      lastName: 'Accountant',
      role: 'ACCOUNTANT',
      permissions: '{}',
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  const bookingAgent1 = await prisma.users.upsert({
    where: { email: 'agent1@tourism.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      username: 'agent1',
      email: 'agent1@tourism.com',
      password: await bcrypt.hash('agent123', 10),
      firstName: 'Sarah',
      lastName: 'Agent',
      role: 'BOOKING_AGENT',
      permissions: '{}',
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  const csAgent1 = await prisma.users.upsert({
    where: { email: 'cs1@tourism.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      username: 'cs1',
      email: 'cs1@tourism.com',
      password: await bcrypt.hash('cs123', 10),
      firstName: 'Mike',
      lastName: 'Customer Service',
      role: 'CUSTOMER_SERVICE',
      permissions: '{}',
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('✅ Sample users created');
  
  // Create Employees
  console.log('👔 Creating employee profiles...');
  
  // Create employee profile for CEO (for sales commissions)
  await prisma.employees.upsert({
    where: { userId: admin.id },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      userId: admin.id,
      employeeCode: 'EMP-000',
      department: 'MANAGEMENT',
      defaultCommissionRate: 5.0,
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  await prisma.employees.upsert({
    where: { userId: bookingAgent1.id },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      userId: bookingAgent1.id,
      employeeCode: 'EMP-001',
      department: 'BOOKING',
      defaultCommissionRate: 3.0,
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  await prisma.employees.upsert({
    where: { userId: csAgent1.id },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      userId: csAgent1.id,
      employeeCode: 'EMP-002',
      department: 'CUSTOMER_SERVICE',
      defaultCommissionRate: 2.0,
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('✅ Employee profiles created');
  
  // Create Sample Customers
  console.log('🧑‍🤝‍🧑 Creating sample customers...');
  
  const customer1 = await prisma.customers.upsert({
    where: { customerCode: 'CUST-001' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      customerCode: 'CUST-001',
      type: 'INDIVIDUAL',
      firstName: 'Ahmed',
      lastName: 'Ali',
      email: 'ahmed.ali@email.com',
      phone: '+971 50 123 4567',
      addressLine1: 'Jumeirah Beach Road',
      city: 'Dubai',
      country: 'United Arab Emirates',
      taxRegistered: false,
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  const customer2 = await prisma.customers.upsert({
    where: { customerCode: 'CUST-002' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      customerCode: 'CUST-002',
      type: 'CORPORATE',
      companyName: 'Business Travel Solutions LLC',
      firstName: 'Mohammed',
      lastName: 'Hassan',
      email: 'mohammed@businesstravel.ae',
      phone: '+971 4 987 6543',
      addressLine1: 'Sheikh Zayed Road',
      city: 'Dubai',
      country: 'United Arab Emirates',
      taxNumber: '100987654300001',
      taxRegistered: true,
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('✅ Sample customers created');
  
  // Create Sample Suppliers
  console.log('🏢 Creating sample suppliers...');
  
  const supplier1 = await prisma.suppliers.upsert({
    where: { supplierCode: 'SUP-001' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      supplierCode: 'SUP-001',
      companyName: 'Emirates Airlines',
      contactPerson: 'Sales Department',
      email: 'sales@emirates.com',
      phone: '+971 4 214 4444',
      addressLine1: 'Emirates Headquarters',
      city: 'Dubai',
      country: 'United Arab Emirates',
      currency: 'AED',
      serviceTypes: 'FLIGHT',
      taxRegistered: true,
      taxNumber: '100234567800001',
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  const supplier2 = await prisma.suppliers.upsert({
    where: { supplierCode: 'SUP-002' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      supplierCode: 'SUP-002',
      companyName: 'Jumeirah Hotels & Resorts',
      contactPerson: 'Reservations',
      email: 'reservations@jumeirah.com',
      phone: '+971 4 366 8888',
      addressLine1: 'Jumeirah Beach Hotel',
      city: 'Dubai',
      country: 'United Arab Emirates',
      currency: 'AED',
      serviceTypes: 'HOTEL',
      taxRegistered: true,
      taxNumber: '100345678900001',
      isActive: true,
      updatedAt: new Date()
    }
  });
  
  const supplier3 = await prisma.suppliers.upsert({
    where: { supplierCode: 'SUP-003' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      supplierCode: 'SUP-003',
      companyName: 'Dubai Transport Services',
      contactPerson: 'Operations',
      email: 'ops@dubaitransport.ae',
      phone: '+971 50 999 8888',
      addressLine1: 'Al Quoz Industrial Area',
      city: 'Dubai',
      country: 'United Arab Emirates',
      currency: 'AED',
      serviceTypes: 'TRANSFER,RENT_CAR',
      taxRegistered: true,
      taxNumber: '100456789000001',
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('✅ Sample suppliers created');
  
  // Create Chart of Accounts
  console.log('📊 Creating chart of accounts...');
  
  // Assets
  const assets = await prisma.accounts.upsert({
    where: { code: '1000' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '1000',
      name: 'Assets',
      nameAr: 'الأصول',
      type: 'ASSET',
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  const currentAssets = await prisma.accounts.upsert({
    where: { code: '1100' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '1100',
      name: 'Current Assets',
      nameAr: 'الأصول المتداولة',
      type: 'ASSET',
      category: 'Current',
      parentId: assets.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  // Cash and Bank Accounts
  await prisma.accounts.upsert({
    where: { code: '1110' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '1110',
      name: 'Cash in Hand',
      nameAr: 'النقد في الصندوق',
      type: 'ASSET',
      category: 'Current',
      parentId: currentAssets.id,
      isActive: true,
      allowManualEntry: true,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '1120' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '1120',
      name: 'Bank Account',
      nameAr: 'الحساب البنكي',
      type: 'ASSET',
      category: 'Current',
      parentId: currentAssets.id,
      isActive: true,
      allowManualEntry: true,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '1130' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '1130',
      name: 'Accounts Receivable',
      nameAr: 'الذمم المدينة',
      type: 'ASSET',
      category: 'Current',
      parentId: currentAssets.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '1140' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '1140',
      name: 'VAT Recoverable',
      nameAr: 'ضريبة القيمة المضافة القابلة للاسترداد',
      type: 'ASSET',
      category: 'Current',
      parentId: currentAssets.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  // Liabilities
  const liabilities = await prisma.accounts.upsert({
    where: { code: '2000' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '2000',
      name: 'Liabilities',
      nameAr: 'الخصوم',
      type: 'LIABILITY',
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  const currentLiabilities = await prisma.accounts.upsert({
    where: { code: '2100' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '2100',
      name: 'Current Liabilities',
      nameAr: 'الخصوم المتداولة',
      type: 'LIABILITY',
      category: 'Current',
      parentId: liabilities.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '2110' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '2110',
      name: 'Accounts Payable',
      nameAr: 'الذمم الدائنة',
      type: 'LIABILITY',
      category: 'Current',
      parentId: currentLiabilities.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '2130' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '2130',
      name: 'VAT Payable',
      nameAr: 'ضريبة القيمة المضافة المستحقة',
      type: 'LIABILITY',
      category: 'Current',
      parentId: currentLiabilities.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  // Equity
  await prisma.accounts.upsert({
    where: { code: '3000' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '3000',
      name: 'Equity',
      nameAr: 'حقوق الملكية',
      type: 'EQUITY',
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  // Revenue
  const revenue = await prisma.accounts.upsert({
    where: { code: '4000' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '4000',
      name: 'Revenue',
      nameAr: 'الإيرادات',
      type: 'REVENUE',
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  // Service Revenue Accounts
  await prisma.accounts.upsert({
    where: { code: '4110' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '4110',
      name: 'Flight Booking Revenue',
      nameAr: 'إيرادات حجز الطيران',
      type: 'REVENUE',
      parentId: revenue.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '4120' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '4120',
      name: 'Hotel Booking Revenue',
      nameAr: 'إيرادات حجز الفنادق',
      type: 'REVENUE',
      parentId: revenue.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '4130' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '4130',
      name: 'Visa Service Revenue',
      nameAr: 'إيرادات خدمات التأشيرات',
      type: 'REVENUE',
      parentId: revenue.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '4140' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '4140',
      name: 'Transfer Service Revenue',
      nameAr: 'إيرادات خدمات النقل',
      type: 'REVENUE',
      parentId: revenue.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '4200' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '4200',
      name: 'Other Revenue',
      nameAr: 'إيرادات أخرى',
      type: 'REVENUE',
      parentId: revenue.id,
      isActive: true,
      allowManualEntry: true,
      updatedAt: new Date()
    }
  });
  
  // Expenses
  const expenses = await prisma.accounts.upsert({
    where: { code: '5000' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: randomUUID(),
      code: '5000',
      name: 'Expenses',
      nameAr: 'المصروفات',
      type: 'EXPENSE',
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '5110' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '5110',
      name: 'Cost of Sales',
      nameAr: 'تكلفة المبيعات',
      type: 'EXPENSE',
      parentId: expenses.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  await prisma.accounts.upsert({
    where: { code: '5220' },
    update: { updatedAt: new Date() },
    create: {
      id: randomUUID(),
      code: '5220',
      name: 'Commission Expense',
      nameAr: 'مصاريف العمولات',
      type: 'EXPENSE',
      parentId: expenses.id,
      isActive: true,
      allowManualEntry: false,
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Chart of accounts created');
  
  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('CEO Admin: Username: Yasser / Password: Body@2017');
  console.log('Accountant: Username: accountant / Password: accountant123');
  console.log('Booking Agent: Username: agent1 / Password: agent123');
  console.log('Customer Service: Username: cs1 / Password: cs123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

