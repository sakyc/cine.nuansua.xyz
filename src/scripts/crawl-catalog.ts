import { crawlCatalog } from '../services/CatalogCrawler';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { config } from '../config/env';

/** Usage: npm run catalog:crawl -- [pages=2500]. Continues from the stored position. */
async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required for catalog crawl');
  const pages = Number(process.argv[2] || 2500);
  if (!Number.isInteger(pages) || pages < 1) throw new Error('pages must be a positive integer');
  try {
    const stats = await crawlCatalog({ maxPages: pages, delayMs: config.catalogCrawlDelayMs, maxAgeMs: 7 * 86400_000, maxFailures: 10, log: true });
    logger.info('Catalog crawl finished', stats ?? { skipped: 'already running' });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  logger.error('Catalog crawl failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
