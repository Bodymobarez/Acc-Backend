import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('🔄 Starting database backup...\n');
  
  const backup: Record<string, any> = {
    backupDate: new Date().toISOString(),
    version: '1.0',
    data: {}
  };

  try {
    // Backup all tables (using lowercase names from schema)
    console.log('📦 Backing up users...');
    backup.data.users = await prisma.users.findMany();
    console.log(`   ✅ ${backup.data.users.length} users`);

    console.log('📦 Backing up customers...');
    backup.data.customers = await prisma.customers.findMany();
    console.log(`   ✅ ${backup.data.customers.length} customers`);

    console.log('📦 Backing up bookings...');
    backup.data.bookings = await prisma.bookings.findMany();
    console.log(`   ✅ ${backup.data.bookings.length} bookings`);

    console.log('📦 Backing up invoices...');
    backup.data.invoices = await prisma.invoices.findMany();
    console.log(`   ✅ ${backup.data.invoices.length} invoices`);

    console.log('📦 Backing up receipts...');
    backup.data.receipts = await prisma.receipts.findMany();
    console.log(`   ✅ ${backup.data.receipts.length} receipts`);

    console.log('📦 Backing up currencies...');
    backup.data.currencies = await prisma.currencies.findMany();
    console.log(`   ✅ ${backup.data.currencies.length} currencies`);

    console.log('📦 Backing up accounts...');
    backup.data.accounts = await prisma.accounts.findMany();
    console.log(`   ✅ ${backup.data.accounts.length} accounts`);

    console.log('📦 Backing up journal_entries...');
    backup.data.journal_entries = await prisma.journal_entries.findMany();
    console.log(`   ✅ ${backup.data.journal_entries.length} journal entries`);

    console.log('📦 Backing up hotels...');
    backup.data.hotels = await prisma.hotels.findMany();
    console.log(`   ✅ ${backup.data.hotels.length} hotels`);

    console.log('📦 Backing up countries...');
    backup.data.countries = await prisma.countries.findMany();
    console.log(`   ✅ ${backup.data.countries.length} countries`);

    console.log('📦 Backing up cities...');
    backup.data.cities = await prisma.cities.findMany();
    console.log(`   ✅ ${backup.data.cities.length} cities`);

    console.log('📦 Backing up airlines...');
    backup.data.airlines = await prisma.airlines.findMany();
    console.log(`   ✅ ${backup.data.airlines.length} airlines`);

    console.log('📦 Backing up suppliers...');
    backup.data.suppliers = await prisma.suppliers.findMany();
    console.log(`   ✅ ${backup.data.suppliers.length} suppliers`);

    console.log('📦 Backing up booking_suppliers...');
    backup.data.booking_suppliers = await prisma.booking_suppliers.findMany();
    console.log(`   ✅ ${backup.data.booking_suppliers.length} booking suppliers`);

    console.log('📦 Backing up notifications...');
    backup.data.notifications = await prisma.notifications.findMany();
    console.log(`   ✅ ${backup.data.notifications.length} notifications`);

    console.log('📦 Backing up company_settings...');
    backup.data.company_settings = await prisma.company_settings.findMany();
    console.log(`   ✅ ${backup.data.company_settings.length} company settings`);

    console.log('📦 Backing up system_settings...');
    backup.data.system_settings = await prisma.system_settings.findMany();
    console.log(`   ✅ ${backup.data.system_settings.length} system settings`);

    console.log('📦 Backing up employees...');
    backup.data.employees = await prisma.employees.findMany();
    console.log(`   ✅ ${backup.data.employees.length} employees`);

    console.log('📦 Backing up files...');
    backup.data.files = await prisma.files.findMany();
    console.log(`   ✅ ${backup.data.files.length} files`);

    console.log('📦 Backing up customer_assignments...');
    backup.data.customer_assignments = await prisma.customer_assignments.findMany();
    console.log(`   ✅ ${backup.data.customer_assignments.length} customer assignments`);

    console.log('📦 Backing up activity_logs...');
    backup.data.activity_logs = await prisma.activity_logs.findMany();
    console.log(`   ✅ ${backup.data.activity_logs.length} activity logs`);

    // Save to file
    const filename = `backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const filepath = `./${filename}`;
    
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 File saved: ${filepath}`);
    
    // Summary
    console.log('\n📊 Backup Summary:');
    console.log('─'.repeat(40));
    let totalRecords = 0;
    for (const [table, records] of Object.entries(backup.data)) {
      const count = (records as any[]).length;
      totalRecords += count;
      console.log(`   ${table}: ${count} records`);
    }
    console.log('─'.repeat(40));
    console.log(`   TOTAL: ${totalRecords} records`);
    console.log(`   File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
