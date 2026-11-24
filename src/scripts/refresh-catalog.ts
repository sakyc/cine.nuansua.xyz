import { catalog } from '../services/catalog';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { config } from '../config/env';

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required for catalog refresh');
  try {
    await catalog.refreshCatalog();
    logger.info('Catalog refresh complete');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  logger.error('Catalog refresh failed; check database, migrations and upstream connectivity');
  process.exitCode = 1;
});
