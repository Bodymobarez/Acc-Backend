import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function addMissingAccounts() {
  try {
    console.log("➕ Adding missing service accounts...\n");

    // Car Rental Revenue Account
    const carRentalRevenue = await prisma.accounts.findFirst({
      where: { code: "4160" }
    });

    if (!carRentalRevenue) {
      await prisma.accounts.create({
        data: {
          id: randomUUID(),
          code: "4160",
          name: "Car Rental Revenue",
          nameAr: "إيرادات تأجير السيارات",
          type: "REVENUE",
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log("✅ Created: 4160 - Car Rental Revenue");
    } else {
      console.log("ℹ️  Already exists: 4160 - Car Rental Revenue");
    }

    // Car Rental Cost Account
    const carRentalCost = await prisma.accounts.findFirst({
      where: { code: "5150" }
    });

    if (!carRentalCost) {
      await prisma.accounts.create({
        data: {
          id: randomUUID(),
          code: "5150",
          name: "Car Rental Costs",
          nameAr: "تكلفة تأجير السيارات",
          type: "EXPENSE",
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log("✅ Created: 5150 - Car Rental Costs");
    } else {
      console.log("ℹ️  Already exists: 5150 - Car Rental Costs");
    }

    // Transfer Services Revenue Account
    const transferRevenue = await prisma.accounts.findFirst({
      where: { code: "4150" }
    });

    if (!transferRevenue) {
      await prisma.accounts.create({
        data: {
          id: randomUUID(),
          code: "4150",
          name: "Transfer Services Revenue",
          nameAr: "إيرادات خدمات النقل",
          type: "REVENUE",
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log("✅ Created: 4150 - Transfer Services Revenue");
    } else {
      console.log("ℹ️  Already exists: 4150 - Transfer Services Revenue");
    }

    // Transfer Services Cost Account (5140 already exists as Ground Services)
    console.log("ℹ️  Using existing: 5140 - Ground Services Costs (for transfers)");

    console.log("\n✅ All service accounts ready!\n");

    // Display final mapping
    console.log("📋 Final Account Mapping:\n");
    console.log("FLIGHT:");
    console.log("  Revenue: 4110 - Flight Booking Revenue");
    console.log("  Cost:    5110 - Flight Ticket Costs\n");
    
    console.log("HOTEL:");
    console.log("  Revenue: 4120 - Hotel Booking Revenue");
    console.log("  Cost:    5120 - Hotel Accommodation Costs\n");
    
    console.log("VISA:");
    console.log("  Revenue: 4130 - Visa Services Revenue");
    console.log("  Cost:    5130 - Visa Processing Costs\n");
    
    console.log("RENTAL_CAR:");
    console.log("  Revenue: 4160 - Car Rental Revenue");
    console.log("  Cost:    5150 - Car Rental Costs\n");
    
    console.log("TRANSFER:");
    console.log("  Revenue: 4150 - Transfer Services Revenue");
    console.log("  Cost:    5140 - Ground Services Costs\n");

    await prisma.$disconnect();
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addMissingAccounts();
