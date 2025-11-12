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

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
