import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { isJsonObject } from '../types/catalog';

export const cache = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (!redis || redis.status !== 'ready') {
      return next();
    }

    const key = `__express_v2__${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        const entry: unknown = JSON.parse(cachedResponse);
        if (isJsonObject(entry) && entry.status === 200 && 'body' in entry
          && !(isJsonObject(entry.body) && entry.body.success === false)) {
          return res.status(200).json(entry.body);
        }
      }
    } catch {
      logger.warn('Response cache read failed');
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200 && !(isJsonObject(body) && body.success === false)) {
        try {
          const entry = JSON.stringify({ status: 200, body });
          if (Buffer.byteLength(entry) <= 1024 * 1024) {
            void redis.set(key, entry, 'EX', durationInSeconds).catch(() => logger.warn('Response cache write failed'));
          }
        } catch {
          logger.warn('Response could not be cached');
        }
      }
      return originalJson(body);
    };
    return next();
  };
};
