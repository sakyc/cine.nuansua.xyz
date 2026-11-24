import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { catalog } from '../services/catalog';
import { config } from '../config/env';
import { hasAdminSecret } from '../middlewares/security';

export const runCron = async (req: Request, res: Response) => {
  try {
    if (!config.cronSecret) {
      return res.status(503).json({ success: false, message: 'Cron authentication is not configured' });
    }
    if (!hasAdminSecret(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await catalog.refreshCatalog();

    res.status(200).json({ success: true, message: 'Cron job executed successfully' });
  } catch {
    logger.error('Catalog cron refresh failed');
    res.status(500).json({ success: false, message: 'Cron job failed' });
  }
};
