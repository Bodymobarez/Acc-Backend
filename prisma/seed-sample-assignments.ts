import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create sample customer assignments for testing RBAC
 */
async function seedSampleAssignments() {
  console.log('🔐 Seeding Sample Customer Assignments for RBAC Testing...');
  console.log('==========================================================\n');

  try {
    // Get users
    const samar = await prisma.user.findUnique({
      where: { username: 'samar' }
    });

    const yasser = await prisma.user.findUnique({
      where: { username: 'yasser' }
    });

    if (!samar) {
      console.log('❌ User "samar" not found. Creating...');
      // Create samar if doesn't exist
      const newSamar = await prisma.user.create({
        data: {
          username: 'samar',
          email: 'samar@bookingdesk.travel',
          password: '$2a$10$YourHashedPasswordHere', // Will need to reset
          firstName: 'Samar',
          lastName: 'Agent',
          role: 'BOOKING_AGENT',
          isActive: true,
          permissions: JSON.stringify({
            viewDashboard: true,
            viewBookings: true,
            createBooking: true,
            editBooking: true,
            viewCustomers: true,
            viewSuppliers: true,
            viewInvoices: true,
            createInvoice: true
          })
        }
      });
      console.log(`✅ Created user: ${newSamar.email}`);
    }

    if (!yasser) {
      console.log('❌ Admin user "yasser" not found!');
      return;
    }

    // Get or create sample customers
    const customers = await prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' }
    });

    if (customers.length === 0) {
      console.log('❌ No customers found in database!');
      console.log('Please create some customers first.');
      return;
    }

    console.log(`\n📊 Found ${customers.length} customers in database:\n`);
    customers.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.customerCode} - ${c.companyName}`);
    });

    // Assign first 2-3 customers to Samar
    const assignToSamar = customers.slice(0, Math.min(3, customers.length));
    
    console.log(`\n👤 Assigning ${assignToSamar.length} customers to Samar (BOOKING_AGENT):\n`);

    for (const customer of assignToSamar) {
      const assignment = await prisma.customerAssignment.upsert({
        where: {
          customerId_userId_assignedRole: {
            customerId: customer.id,
            userId: samar!.id,
            assignedRole: 'BOOKING_AGENT'
          }
        },
        update: {
          isActive: true,
          commissionRate: 3.0,
          flightCommission: 2.5,
          hotelCommission: 4.0,
          visaCommission: 5.0
        },
        create: {
          customerId: customer.id,
          userId: samar!.id,
          assignedRole: 'BOOKING_AGENT',
          isActive: true,
          commissionRate: 3.0,
          flightCommission: 2.5,
          hotelCommission: 4.0,
          visaCommission: 5.0,
          notes: 'Assigned for RBAC testing'
        }
      });

      console.log(`   ✅ ${customer.customerCode} - ${customer.companyName}`);
      console.log(`      Commission: ${assignment.commissionRate}% (Flight: ${assignment.flightCommission}%, Hotel: ${assignment.hotelCommission}%)`);
    }

    // Get assignment counts
    const samarAssignments = await prisma.customerAssignment.count({
      where: {
        userId: samar!.id,
        isActive: true
      }
    });

    const yasserAssignments = await prisma.customerAssignment.count({
      where: {
        userId: yasser.id,
        isActive: true
      }
    });

    // Summary
    console.log('\n==========================================================');
    console.log('✅ Sample Assignments Created Successfully!\n');
    console.log('📊 Assignment Summary:');
    console.log(`   • Samar (BOOKING_AGENT): ${samarAssignments} customers assigned`);
    console.log(`   • Yasser (ADMIN): ${yasserAssignments} customers (Admin has full access)\n`);

    console.log('🔐 RBAC Testing:');
    console.log('   1. Login as Samar → Should see ONLY assigned customers');
    console.log('   2. Login as Yasser → Should see ALL customers (Admin)');
    console.log('   3. Samar can only view/edit bookings for assigned customers');
    console.log('   4. Yasser can view/edit ALL bookings\n');

    console.log('🧪 Test Commands:');
    console.log('   # Login as Samar');
    console.log('   curl -X POST http://localhost:3001/api/auth/login \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"username":"samar","password":"Body@2017"}\'');
    console.log('');
    console.log('   # Check Samar\'s assignments');
    console.log('   curl http://localhost:3001/api/assignments/my-assignments \\');
    console.log('     -H "Authorization: Bearer <samar_token>"');
    console.log('');
    console.log('   # Get bookings (should be filtered)');
    console.log('   curl http://localhost:3001/api/bookings \\');
    console.log('     -H "Authorization: Bearer <samar_token>"');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding assignments:', error);
    throw error;
  }
}

async function main() {
  await seedSampleAssignments();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
