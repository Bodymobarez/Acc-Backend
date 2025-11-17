import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function migrateBookingLocations() {
    console.log('🚀 Starting booking location migration...');
    try {
        // Get all bookings with HOTEL service type
        const bookings = await prisma.bookings.findMany({
            where: {
                serviceType: 'HOTEL'
            }
        });
        console.log(`📊 Found ${bookings.length} hotel bookings`);
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        for (const booking of bookings) {
            try {
                // Parse service details
                let serviceDetails = {};
                if (typeof booking.serviceDetails === 'string') {
                    try {
                        serviceDetails = JSON.parse(booking.serviceDetails);
                    }
                    catch (e) {
                        console.log(`⚠️  Booking ${booking.bookingNumber}: Invalid JSON`);
                        failed++;
                        continue;
                    }
                }
                else {
                    serviceDetails = booking.serviceDetails;
                }
                // Skip if already has countryId and cityId
                if (serviceDetails.countryId && serviceDetails.cityId) {
                    console.log(`✅ Booking ${booking.bookingNumber}: Already has location IDs`);
                    skipped++;
                    continue;
                }
                // Skip if no city name
                if (!serviceDetails.city) {
                    console.log(`⚠️  Booking ${booking.bookingNumber}: No city name found`);
                    skipped++;
                    continue;
                }
                const cityName = serviceDetails.city.toLowerCase().trim();
                console.log(`🔍 Booking ${booking.bookingNumber}: Looking for city "${cityName}"`);
                // Find city by name (case-insensitive)
                const city = await prisma.cities.findFirst({
                    where: {
                        name: {
                            equals: cityName,
                            mode: 'insensitive'
                        }
                    },
                    include: {
                        country: true
                    }
                });
                if (!city) {
                    console.log(`❌ Booking ${booking.bookingNumber}: City "${cityName}" not found in database`);
                    failed++;
                    continue;
                }
                // Update service details with IDs
                serviceDetails.cityId = city.id;
                serviceDetails.countryId = city.countryId;
                serviceDetails.country = city.country.name;
                // Update booking
                await prisma.bookings.update({
                    where: { id: booking.id },
                    data: {
                        serviceDetails: JSON.stringify(serviceDetails)
                    }
                });
                console.log(`✅ Booking ${booking.bookingNumber}: Updated with city "${city.name}" (${city.id}) in country "${city.country.name}" (${city.countryId})`);
                updated++;
            }
            catch (error) {
                console.error(`❌ Booking ${booking.bookingNumber}: Error - ${error.message}`);
                failed++;
            }
        }
        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Total: ${bookings.length}`);
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run migration
migrateBookingLocations()
    .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
});
