import cron from 'node-cron';
import { logger } from '../config/logger';
import { catalog } from '../services/catalog';
import { config } from '../config/env';
import { crawlCatalog } from '../services/CatalogCrawler';

export const startCronJobs = () => {
  if (!config.databaseUrl) {
    logger.warn('Catalog refresh disabled: DATABASE_URL is missing');
    return;
  }

  // Run every 30 minutes
  const refresh = async () => {
    logger.info('Refreshing catalog snapshots');
    try {
      await catalog.refreshCatalog();
      logger.info('Catalog refresh complete');
    } catch {
      logger.warn('Catalog refresh failed; last successful data remains available');
    }
    for (const source of config.catalogCrawlPagesPerRun > 0 ? config.catalogCrawlSources : []) {
      const stats = await crawlCatalog({
        source, maxPages: config.catalogCrawlPagesPerRun, delayMs: config.catalogCrawlDelayMs, maxAgeMs: 7 * 86400_000,
      }).catch(() => null);
      if (stats) logger.info('Catalog crawl step complete', { source, pages: stats.pages, fetched: stats.fetched, failures: stats.failures, ...stats.cursor });
    }
  };
  cron.schedule('*/30 * * * *', refresh, { timezone: 'UTC' });
  void refresh();
  
  logger.info('Cron jobs initialized');
};
