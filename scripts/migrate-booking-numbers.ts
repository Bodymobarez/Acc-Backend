/**
 * Migration Script: Update old booking numbers to new service-type based prefixes
 * 
 * Old: BKG-YYYY-XXXXXX (for all)
 * New prefixes based on service type:
 *   HTL  = Hotel
 *   AIR  = Flight
 *   TR   = Transfer
 *   RNT  = Rent Car
 *   VISA = Visa
 *   ACT  = Activity
 *   CRU  = Cruise
 *   RFN  = Refunded (unchanged)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SERVICE_TYPE_PREFIX_MAP: { [key: string]: string } = {
  'HOTEL': 'HTL',
  'FLIGHT': 'AIR',
  'TRANSFER': 'TR',
  'RENT_CAR': 'RNT',
  'RENTCAR': 'RNT',
  'RENTAL_CAR': 'RNT',
  'CAR_RENTAL': 'RNT',
  'VISA': 'VISA',
  'ACTIVITY': 'ACT',
  'CRUISE': 'CRU',
  'TRAIN': 'TRN',
  'OTHER': 'OTH'
};

async function migrateBookingNumbers() {
  console.log('🚀 Starting booking number migration...\n');

  try {
    // Get all bookings that start with BKG (old format)
    const bookingsToMigrate = await prisma.bookings.findMany({
      where: {
        bookingNumber: { startsWith: 'BKG' }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        bookingNumber: true,
        serviceType: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${bookingsToMigrate.length} bookings with BKG prefix to migrate\n`);

    if (bookingsToMigrate.length === 0) {
      console.log('✅ No bookings need migration!');
      return;
    }

    // Track sequence numbers per prefix per year
    const sequenceCounters: { [key: string]: number } = {};

    // Initialize counters by checking existing bookings with new prefixes
    for (const prefix of Object.values(SERVICE_TYPE_PREFIX_MAP)) {
      const lastBooking = await prisma.bookings.findFirst({
        where: { bookingNumber: { startsWith: prefix } },
        orderBy: { bookingNumber: 'desc' }
      });
      
      if (lastBooking) {
        const parts = lastBooking.bookingNumber.split('-');
        const year = parts[1];
        const seq = parseInt(parts[2] || '0');
        const key = `${prefix}-${year}`;
        sequenceCounters[key] = seq;
      }
    }

    let migrated = 0;
    let errors = 0;
    const results: { old: string, new: string, service: string }[] = [];

    for (const booking of bookingsToMigrate) {
      try {
        // Determine new prefix based on service type
        const serviceType = booking.serviceType?.toUpperCase() || 'OTHER';
        const newPrefix = SERVICE_TYPE_PREFIX_MAP[serviceType] || 'BKG';
        
        // Extract year from original booking number or use creation date
        const originalParts = booking.bookingNumber.split('-');
        const year = originalParts[1] || new Date(booking.createdAt).getFullYear().toString();
        
        // Get next sequence for this prefix-year combination
        const counterKey = `${newPrefix}-${year}`;
        sequenceCounters[counterKey] = (sequenceCounters[counterKey] || 0) + 1;
        const newSequence = sequenceCounters[counterKey];
        
        // Generate new booking number
        const newBookingNumber = `${newPrefix}-${year}-${newSequence.toString().padStart(6, '0')}`;
        
        // Update the booking
        await prisma.bookings.update({
          where: { id: booking.id },
          data: { bookingNumber: newBookingNumber }
        });

        results.push({
          old: booking.bookingNumber,
          new: newBookingNumber,
          service: serviceType
        });
        
        migrated++;
        
        if (migrated % 10 === 0) {
          console.log(`⏳ Migrated ${migrated}/${bookingsToMigrate.length}...`);
        }
      } catch (error: any) {
        console.error(`❌ Error migrating ${booking.bookingNumber}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${bookingsToMigrate.length}`);
    console.log('='.repeat(60) + '\n');

    // Print sample results
    console.log('📝 Sample migrations (first 20):');
    console.log('-'.repeat(60));
    results.slice(0, 20).forEach(r => {
      console.log(`  ${r.old} → ${r.new} (${r.service})`);
    });
    
    if (results.length > 20) {
      console.log(`  ... and ${results.length - 20} more`);
    }

    // Count by new prefix
    console.log('\n📊 Breakdown by service type:');
    console.log('-'.repeat(60));
    const breakdown: { [key: string]: number } = {};
    results.forEach(r => {
      const prefix = r.new.split('-')[0];
      breakdown[prefix] = (breakdown[prefix] || 0) + 1;
    });
    Object.entries(breakdown).forEach(([prefix, count]) => {
      console.log(`  ${prefix}: ${count} bookings`);
    });

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateBookingNumbers()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
