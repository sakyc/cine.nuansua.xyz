import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
export function hasAdminSecret(req: Request): boolean {
  if (!config.cronSecret) return false;
  const supplied = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${config.cronSecret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Admin-only endpoints: 503 when no secret is configured, 401 when it does not match. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!config.cronSecret) return res.status(503).json({ success: false, message: 'Admin authentication is not configured' });
  if (!hasAdminSecret(req)) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

const limiter = (perMinute: number, message: string) => rateLimit({
  windowMs: 60_000,
  limit: perMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: hasAdminSecret,
  handler: (_req, res) => res.status(429).json({ success: false, error: { message, status: 429 } }),
});

const isSegmentTraffic = (req: Request) => /^\/playback\/[a-f0-9]{48}\//.test(req.path);

/** Default budget for every API call except video segments, which have their own limit. */
export const apiLimiter = (() => {
  const base = limiter(config.rateLimitPerMinute, 'Too many requests; slow down and retry shortly');
  return (req: Request, res: Response, next: NextFunction) => isSegmentTraffic(req) ? next() : base(req, res, next);
})();
/** Endpoints that may trigger an upstream LK21 fetch for an uncached slug. */
export const upstreamLimiter = limiter(Math.max(10, Math.floor(config.rateLimitPerMinute / 2)), 'Too many detail requests; retry shortly');
export const playbackCreateLimiter = limiter(10, 'Too many playback requests; retry shortly');
export const segmentLimiter = limiter(600, 'Too many video requests; retry shortly');
export const subtitleLimiter = limiter(20, 'Too many subtitle requests; retry shortly');

export function requirePlaybackEnabled(_req: Request, res: Response, next: NextFunction) {
  if (!config.playbackEnabled) return res.status(404).json({ success: false, error: { message: 'Playback is disabled on this server', status: 404 } });
  next();
}
