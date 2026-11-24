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
  // Listing pages the background crawler indexes per 30-minute run (0 disables), and the pause after each fetch.
  catalogCrawlPagesPerRun: integerSetting('CATALOG_CRAWL_PAGES_PER_RUN', 20, 0, 500),
  catalogCrawlDelayMs: integerSetting('CATALOG_CRAWL_DELAY_MS', 2000, 250, 60000),
  upstreamTimeoutMs: integerSetting('UPSTREAM_TIMEOUT_MS', 8000, 1000, 30000),
  // Time budget for one page across all mirrors (failover stops when it runs out).
  upstreamTotalTimeoutMs: integerSetting('UPSTREAM_TOTAL_TIMEOUT_MS', 15000, 2000, 120000),
  // Extra hosts (and their subdomains) the scraper may be redirected to, e.g. new LK21 mirror domains.
  redirectHosts: (process.env.UPSTREAM_REDIRECT_HOSTS || 'lk21.de,lk21official.cc,lk21official.dev,nontondrama.vip')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  cronSecret: process.env.CRON_SECRET || '',
  lk21BaseUrl: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://tv13.lk21official.cc').split(',')[0].trim().replace(/\/$/, ''),
  lk21BaseUrls: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://tv13.lk21official.cc')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // LK21's series site (drakor and other series), comma-separated mirrors tried in order.
  dramaBaseUrls: (process.env.DRAMA_BASE_URLS || 'https://tv1.nontondrama.vip')
    .split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean),
  proxyUrl: process.env.LK21_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Comma-separated browser origins allowed to call the API. Empty = same-origin only in
  // production, any origin in development.
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean),
  // Number of reverse proxies in front of the API (Vercel/Nginx = 1) so req.ip is the viewer's IP.
  trustProxy: integerSetting('TRUST_PROXY', 0, 0, 10),
  rateLimitPerMinute: integerSetting('RATE_LIMIT_PER_MINUTE', 120, 10, 10000),
  playbackEnabled: (process.env.PLAYBACK_ENABLED || (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
  playbackSessionsPerIp: integerSetting('PLAYBACK_SESSIONS_PER_IP', 3, 1, 50),
  // Player hosts (and their subdomains) that may be embedded as the HYDRAX server. Comma-separated.
  embedHosts: (process.env.EMBED_HOSTS || 'abyssplayer.com,abysscdn.com,abyss.to')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
};
