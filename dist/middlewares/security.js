"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtitleLimiter = exports.segmentLimiter = exports.playbackCreateLimiter = exports.upstreamLimiter = exports.apiLimiter = void 0;
exports.hasAdminSecret = hasAdminSecret;
exports.requireAdmin = requireAdmin;
exports.requirePlaybackEnabled = requirePlaybackEnabled;
const crypto_1 = require("crypto");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
function hasAdminSecret(req) {
    if (!env_1.config.cronSecret)
        return false;
    const supplied = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${env_1.config.cronSecret}`);
    return supplied.length === expected.length && (0, crypto_1.timingSafeEqual)(supplied, expected);
}
/** Admin-only endpoints: 503 when no secret is configured, 401 when it does not match. */
function requireAdmin(req, res, next) {
    if (!env_1.config.cronSecret)
        return res.status(503).json({ success: false, message: 'Admin authentication is not configured' });
    if (!hasAdminSecret(req))
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    next();
}
const limiter = (perMinute, message) => (0, express_rate_limit_1.default)({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: hasAdminSecret,
    handler: (_req, res) => res.status(429).json({ success: false, error: { message, status: 429 } }),
});
const isSegmentTraffic = (req) => /^\/playback\/[a-f0-9]{48}\//.test(req.path);
/** Default budget for every API call except video segments, which have their own limit. */
exports.apiLimiter = (() => {
    const base = limiter(env_1.config.rateLimitPerMinute, 'Too many requests; slow down and retry shortly');
    return (req, res, next) => isSegmentTraffic(req) ? next() : base(req, res, next);
})();
/** Endpoints that may trigger an upstream LK21 fetch for an uncached slug. */
exports.upstreamLimiter = limiter(Math.max(10, Math.floor(env_1.config.rateLimitPerMinute / 2)), 'Too many detail requests; retry shortly');
exports.playbackCreateLimiter = limiter(10, 'Too many playback requests; retry shortly');
exports.segmentLimiter = limiter(600, 'Too many video requests; retry shortly');
exports.subtitleLimiter = limiter(20, 'Too many subtitle requests; retry shortly');
function requirePlaybackEnabled(_req, res, next) {
    if (!env_1.config.playbackEnabled)
        return res.status(404).json({ success: false, error: { message: 'Playback is disabled on this server', status: 404 } });
    next();
}
