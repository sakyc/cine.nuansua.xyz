import cron from 'node-cron';
import { logger } from '../config/logger';
import { catalog } from '../services/catalog';
import { config } from '../config/env';

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
  };
  cron.schedule('*/30 * * * *', refresh, { timezone: 'UTC' });
  void refresh();
  
  logger.info('Cron jobs initialized');
};
