import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { catalog } from '../services/catalog';
import { config } from '../config/env';
import { timingSafeEqual } from 'crypto';

export const runCron = async (req: Request, res: Response) => {
  try {
    if (!config.cronSecret) {
      return res.status(503).json({ success: false, message: 'Cron authentication is not configured' });
    }
    const supplied = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${config.cronSecret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await catalog.refreshCatalog();

    res.status(200).json({ success: true, message: 'Cron job executed successfully' });
  } catch {
    logger.error('Catalog cron refresh failed');
    res.status(500).json({ success: false, message: 'Cron job failed' });
  }
};
