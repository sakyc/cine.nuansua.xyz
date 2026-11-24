import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const integerSetting = (name: string, fallback: number, min: number, max: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

export const config = {
  port: process.env.PORT || 3000,
  redisUrl: process.env.REDIS_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  opensubtitlesApiKey: process.env.OPENSUBTITLES_API_KEY || '',
  catalogTtlSeconds: integerSetting('CATALOG_TTL_SECONDS', 1800, 30, 86400),
  detailTtlSeconds: integerSetting('DETAIL_TTL_SECONDS', 3600, 30, 86400),
  catalogSeedPages: integerSetting('CATALOG_SEED_PAGES', 3, 0, 10),
  upstreamTimeoutMs: integerSetting('UPSTREAM_TIMEOUT_MS', 8000, 1000, 30000),
  cronSecret: process.env.CRON_SECRET || '',
  lk21BaseUrl: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://tv13.lk21official.cc').split(',')[0].trim().replace(/\/$/, ''),
  lk21BaseUrls: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://tv13.lk21official.cc')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  proxyUrl: process.env.LK21_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',
  nodeEnv: process.env.NODE_ENV || 'development'
};
