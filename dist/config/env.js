"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env.local') });
const integerSetting = (name, fallback, min, max) => {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return value;
};
exports.config = {
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
    nodeEnv: process.env.NODE_ENV || 'development',
    // Comma-separated browser origins allowed to call the API. Empty = same-origin only in
    // production, any origin in development.
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean),
    // Number of reverse proxies in front of the API (Vercel/Nginx = 1) so req.ip is the viewer's IP.
    trustProxy: integerSetting('TRUST_PROXY', 0, 0, 10),
    rateLimitPerMinute: integerSetting('RATE_LIMIT_PER_MINUTE', 120, 10, 10000),
    playbackEnabled: (process.env.PLAYBACK_ENABLED || (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
    playbackSessionsPerIp: integerSetting('PLAYBACK_SESSIONS_PER_IP', 3, 1, 50),
};
