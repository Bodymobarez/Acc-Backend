import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - compatible with both ESM and CommonJS
const getDirectoryPath = () => {
  // Check if running in CommonJS mode (bundled by esbuild)
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // Fallback for other environments
  return process.cwd();
};

const dirPath = getDirectoryPath();
dotenv.config({ path: path.join(dirPath, '../../.env') });

// Singleton pattern for Prisma Client
// Prevents multiple instances that can exhaust database connections
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL not found in environment variables');
  console.warn('⚠️  Database operations will fail until DATABASE_URL is set');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(databaseUrl && {
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    }),
  });

// Extend Prisma with retry logic for Neon cold starts
const originalConnect = prisma.$connect.bind(prisma);
prisma.$connect = async () => {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await originalConnect();
      return;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Database connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  if (lastError) throw lastError;
};

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
