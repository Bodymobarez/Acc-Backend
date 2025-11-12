import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log('🌱 Seeding users...');

  const password = await bcrypt.hash('Body@2017', 10);

  const users = [
    {
      username: 'ahmed.accountant',
      email: 'ahmed.accountant@bdesktravel.com',
      password,
      firstName: 'Ahmed',
      lastName: 'Hassan',
      phone: '+971 50 234 5678',
      role: 'ACCOUNTANT',
      department: 'Finance',
      salesTarget: 0,
      commissionRate: 0,
      isActive: true,
      joinedDate: new Date('2023-02-01'),
    },
    {
      username: 'sarah.sales',
      email: 'sarah@bdesktravel.com',
      password,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+971 50 345 6789',
      role: 'SALES_MANAGER',
      department: 'Sales',
      salesTarget: 150000,
      commissionRate: 3.5,
      isActive: true,
      joinedDate: new Date('2023-03-10'),
    },
    {
      username: 'mohammed.sales',
      email: 'mohammed@bdesktravel.com',
      password,
      firstName: 'Mohammed',
      lastName: 'Al-Rashid',
      phone: '+971 50 456 7890',
      role: 'SALES_AGENT',
      department: 'Sales',
      salesTarget: 100000,
      commissionRate: 2.5,
      isActive: true,
      joinedDate: new Date('2023-04-15'),
    },
    {
      username: 'fatima.booking',
      email: 'fatima@bdesktravel.com',
      password,
      firstName: 'Fatima',
      lastName: 'Al-Zahra',
      phone: '+971 50 567 8901',
      role: 'BOOKING_AGENT',
      department: 'Operations',
      salesTarget: 80000,
      commissionRate: 1.5,
      isActive: true,
      joinedDate: new Date('2023-05-20'),
    },
    {
      username: 'omar.cs',
      email: 'omar@bdesktravel.com',
      password,
      firstName: 'Omar',
      lastName: 'Ibrahim',
      phone: '+971 50 678 9012',
      role: 'CUSTOMER_SERVICE',
      department: 'Operations',
      salesTarget: 0,
      commissionRate: 1.0,
      isActive: true,
      joinedDate: new Date('2023-06-10'),
    },
  ];

  for (const userData of users) {
    try {
      const existing = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (!existing) {
        await prisma.user.create({
          data: userData,
        });
        console.log(`✅ Created user: ${userData.username}`);
      } else {
        console.log(`⏭️  User already exists: ${userData.username}`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.username}:`, error);
    }
  }

  console.log('✅ Users seeded successfully!');
}

seedUsers()
  .catch((e) => {
    console.error('❌ Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
