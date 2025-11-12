import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables early - handle serverless environments where import.meta.url might be undefined
const getDirectoryPath = () => {
  if (typeof import.meta.url !== 'undefined') {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
  }
  // Fallback for serverless/bundled environments  
  return process.cwd();
};

const __dirname = getDirectoryPath();
dotenv.config({ path: path.join(__dirname, '../../.env') });

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
