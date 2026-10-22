import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (!config.isProduction) globalForPrisma.prisma = prisma;
