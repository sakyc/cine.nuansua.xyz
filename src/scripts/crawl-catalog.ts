import { crawlCatalog, CrawlSource } from '../services/CatalogCrawler';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { config } from '../config/env';

/**
 * Usage: npm run catalog:crawl -- [pages=2500] [movie|drama|all=CATALOG_CRAWL_SOURCES].
 * Continues from each source's stored position.
 */
async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required for catalog crawl');
  const pages = Number(process.argv[2] || 2500);
  if (!Number.isInteger(pages) || pages < 1) throw new Error('pages must be a positive integer');
  const requested = process.argv[3];
  const list: CrawlSource[] = requested === 'movie' || requested === 'drama' ? [requested] : config.catalogCrawlSources;
  try {
    for (const source of list) {
      const stats = await crawlCatalog({ source, maxPages: pages, delayMs: config.catalogCrawlDelayMs, maxAgeMs: 7 * 86400_000, maxFailures: 10, log: true });
      logger.info('Catalog crawl finished', { source, ...(stats ?? { skipped: 'already running' }) });
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(error => {
  logger.error('Catalog crawl failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
