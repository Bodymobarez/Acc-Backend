import pkg from 'pg';
const { Client: PgClient } = pkg;
import { PrismaClient } from '@prisma/client';

const neonConnection = {
  connectionString: 'postgresql://neondb_owner:npg_V8KJLriGjSn5@ep-lucky-cake-ae2hozjr-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

const pgClient = new PgClient(neonConnection);
const prismaMySQL = new PrismaClient();

async function migrateData() {
  console.log('🔄 Starting migration from Neon PostgreSQL to MySQL...\n');

  try {
    // Connect to both databases
    console.log('📡 Connecting to Neon PostgreSQL...');
    await pgClient.connect();
    console.log('✅ Connected to Neon\n');

    console.log('📡 Connecting to MySQL...');
    await prismaMySQL.$connect();
    console.log('✅ Connected to MySQL\n');

    // Clear existing data from MySQL (disable FK checks)
    console.log('🗑️  Clearing existing MySQL data...');
    await prismaMySQL.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE users');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE currencies');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE employees');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE customers');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE suppliers');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE accounts');
    await prismaMySQL.$executeRawUnsafe('TRUNCATE TABLE company_settings');
    await prismaMySQL.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Cleared existing data\n');

    // 1. Migrate Company Settings
    console.log('📝 Migrating company settings...');
    const companySettingsResult = await pgClient.query('SELECT * FROM company_settings');
    for (const row of companySettingsResult.rows) {
      await prismaMySQL.company_settings.upsert({
        where: { id: row.id },
        update: {
          companyName: row.companyName,
          companyNameArabic: row.companyNameArabic,
          tradeLicense: row.tradeLicense,
          taxRegistrationNo: row.taxRegistrationNo,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          phone: row.phone,
          email: row.email,
          website: row.website,
          logoPath: row.logoPath,
          defaultCurrency: row.defaultCurrency,
          vatRate: parseFloat(row.vatRate),
          vatEnabled: row.vatEnabled,
          invoicePrefix: row.invoicePrefix,
          invoiceTerms: row.invoiceTerms,
          invoiceFooter: row.invoiceFooter,
          filePrefix: row.filePrefix,
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          companyName: row.companyName,
          companyNameArabic: row.companyNameArabic,
          tradeLicense: row.tradeLicense,
          taxRegistrationNo: row.taxRegistrationNo,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          phone: row.phone,
          email: row.email,
          website: row.website,
          logoPath: row.logoPath,
          defaultCurrency: row.defaultCurrency,
          vatRate: parseFloat(row.vatRate),
          vatEnabled: row.vatEnabled,
          invoicePrefix: row.invoicePrefix,
          invoiceTerms: row.invoiceTerms,
          invoiceFooter: row.invoiceFooter,
          filePrefix: row.filePrefix,
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${companySettingsResult.rows.length} company settings\n`);

    // 2. Migrate Currencies
    console.log('💱 Migrating currencies...');
    const currenciesResult = await pgClient.query('SELECT * FROM currencies');
    for (const row of currenciesResult.rows) {
      await prismaMySQL.currencies.upsert({
        where: { id: row.id },
        update: {
          code: row.code,
          name: row.name,
          symbol: row.symbol,
          exchangeRateToAED: parseFloat(row.exchangeRateToAED),
          isActive: row.isActive,
          lastUpdated: new Date(row.lastUpdated)
        },
        create: {
          id: row.id,
          code: row.code,
          name: row.name,
          symbol: row.symbol,
          exchangeRateToAED: parseFloat(row.exchangeRateToAED),
          isActive: row.isActive,
          lastUpdated: new Date(row.lastUpdated)
        }
      });
    }
    console.log(`✅ Migrated ${currenciesResult.rows.length} currencies\n`);

    // 3. Migrate Users
    console.log('👥 Migrating users...');
    const usersResult = await pgClient.query('SELECT * FROM users');
    for (const row of usersResult.rows) {
      await prismaMySQL.users.upsert({
        where: { id: row.id },
        update: {
          username: row.username,
          email: row.email,
          password: row.password,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          permissions: row.permissions,
          isActive: row.isActive,
          avatar: row.avatar,
          phone: row.phone,
          department: row.department,
          joinedDate: row.joinedDate ? new Date(row.joinedDate) : new Date(),
          lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
          commissionRate: row.commissionRate ? parseFloat(row.commissionRate) : 0,
          salesTarget: row.salesTarget ? parseFloat(row.salesTarget) : 0,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          permissions: row.permissions,
          isActive: row.isActive,
          avatar: row.avatar,
          phone: row.phone,
          department: row.department,
          joinedDate: row.joinedDate ? new Date(row.joinedDate) : new Date(),
          lastLogin: row.lastLogin ? new Date(row.lastLogin) : null,
          commissionRate: row.commissionRate ? parseFloat(row.commissionRate) : 0,
          salesTarget: row.salesTarget ? parseFloat(row.salesTarget) : 0,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${usersResult.rows.length} users\n`);

    // 4. Migrate Employees
    console.log('👔 Migrating employees...');
    const employeesResult = await pgClient.query('SELECT * FROM employees');
    for (const row of employeesResult.rows) {
      await prismaMySQL.employees.upsert({
        where: { id: row.id },
        update: {
          userId: row.userId,
          employeeCode: row.employeeCode,
          department: row.department,
          defaultCommissionRate: parseFloat(row.defaultCommissionRate),
          customCommissionRates: row.customCommissionRates,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          userId: row.userId,
          employeeCode: row.employeeCode,
          department: row.department,
          defaultCommissionRate: parseFloat(row.defaultCommissionRate),
          customCommissionRates: row.customCommissionRates,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${employeesResult.rows.length} employees\n`);

    // 5. Migrate Customers
    console.log('🧑‍🤝‍🧑 Migrating customers...');
    const customersResult = await pgClient.query('SELECT * FROM customers');
    for (const row of customersResult.rows) {
      await prismaMySQL.customers.upsert({
        where: { id: row.id },
        update: {
          customerCode: row.customerCode,
          type: row.type,
          companyName: row.companyName,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          taxNumber: row.taxNumber,
          taxRegistered: row.taxRegistered,
          notes: row.notes,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          customerCode: row.customerCode,
          type: row.type,
          companyName: row.companyName,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          taxNumber: row.taxNumber,
          taxRegistered: row.taxRegistered,
          notes: row.notes,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${customersResult.rows.length} customers\n`);

    // 6. Migrate Suppliers
    console.log('🏢 Migrating suppliers...');
    const suppliersResult = await pgClient.query('SELECT * FROM suppliers');
    for (const row of suppliersResult.rows) {
      await prismaMySQL.suppliers.upsert({
        where: { id: row.id },
        update: {
          supplierCode: row.supplierCode,
          companyName: row.companyName,
          contactPerson: row.contactPerson,
          email: row.email,
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          taxNumber: row.taxNumber,
          taxRegistered: row.taxRegistered,
          paymentTerms: row.paymentTerms,
          currency: row.currency,
          serviceTypes: row.serviceTypes,
          notes: row.notes,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          supplierCode: row.supplierCode,
          companyName: row.companyName,
          contactPerson: row.contactPerson,
          email: row.email,
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.postalCode,
          taxNumber: row.taxNumber,
          taxRegistered: row.taxRegistered,
          paymentTerms: row.paymentTerms,
          currency: row.currency,
          serviceTypes: row.serviceTypes,
          notes: row.notes,
          isActive: row.isActive,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${suppliersResult.rows.length} suppliers\n`);

    // 7. Migrate Accounts
    console.log('📊 Migrating chart of accounts...');
    const accountsResult = await pgClient.query('SELECT * FROM accounts ORDER BY code');
    for (const row of accountsResult.rows) {
      await prismaMySQL.accounts.upsert({
        where: { id: row.id },
        update: {
          code: row.code,
          name: row.name,
          nameAr: row.nameAr,
          type: row.type,
          category: row.category,
          parentId: row.parentId,
          balance: parseFloat(row.balance || 0),
          debitBalance: parseFloat(row.debitBalance || 0),
          creditBalance: parseFloat(row.creditBalance || 0),
          isActive: row.isActive,
          allowManualEntry: row.allowManualEntry,
          description: row.description,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        },
        create: {
          id: row.id,
          code: row.code,
          name: row.name,
          nameAr: row.nameAr,
          type: row.type,
          category: row.category,
          parentId: row.parentId,
          balance: parseFloat(row.balance || 0),
          debitBalance: parseFloat(row.debitBalance || 0),
          creditBalance: parseFloat(row.creditBalance || 0),
          isActive: row.isActive,
          allowManualEntry: row.allowManualEntry,
          description: row.description,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }
      });
    }
    console.log(`✅ Migrated ${accountsResult.rows.length} accounts\n`);

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Company Settings: ${companySettingsResult.rows.length}`);
    console.log(`   Currencies: ${currenciesResult.rows.length}`);
    console.log(`   Users: ${usersResult.rows.length}`);
    console.log(`   Employees: ${employeesResult.rows.length}`);
    console.log(`   Customers: ${customersResult.rows.length}`);
    console.log(`   Suppliers: ${suppliersResult.rows.length}`);
    console.log(`   Accounts: ${accountsResult.rows.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pgClient.end();
    await prismaMySQL.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
