import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

const createNoopRedis = () => ({
  status: 'disabled',
  get: async () => null,
  set: async () => 'OK',
  on: () => {},
});

export type CacheClient = {
  status: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
};

let redisInstance: CacheClient;

if (config.redisUrl) {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    retryStrategy: () => null,
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  client.on('error', (err) => {
    logger.error('Redis connection error', err);
  });

  redisInstance = client;
} else {
  logger.warn('REDIS_URL not set, running without cache');
  redisInstance = createNoopRedis();
}

export const redis = redisInstance;
