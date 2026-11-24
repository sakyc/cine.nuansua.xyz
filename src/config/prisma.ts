import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { config } from './env';

let prisma: PrismaClient;

if (!config.databaseUrl) {
  logger.warn('DATABASE_URL not set, Prisma disabled');
  prisma = new Proxy({} as PrismaClient, {
    get: () => {
      throw Object.assign(new Error('Catalog database is not configured'), { status: 503 });
    },
  });
} else {
  prisma = new PrismaClient();
}

export { prisma };
