"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const catalog_1 = require("../types/catalog");
const cache = (durationInSeconds) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        if (!redis_1.redis || redis_1.redis.status !== 'ready') {
            return next();
        }
        const key = `__express_v2__${req.originalUrl || req.url}`;
        try {
            const cachedResponse = await redis_1.redis.get(key);
            if (cachedResponse) {
                const entry = JSON.parse(cachedResponse);
                if ((0, catalog_1.isJsonObject)(entry) && entry.status === 200 && 'body' in entry
                    && !((0, catalog_1.isJsonObject)(entry.body) && entry.body.success === false)) {
                    return res.status(200).json(entry.body);
                }
            }
        }
        catch {
            logger_1.logger.warn('Response cache read failed');
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200 && !((0, catalog_1.isJsonObject)(body) && body.success === false)) {
                try {
                    const entry = JSON.stringify({ status: 200, body });
                    if (Buffer.byteLength(entry) <= 1024 * 1024) {
                        void redis_1.redis.set(key, entry, 'EX', durationInSeconds).catch(() => logger_1.logger.warn('Response cache write failed'));
                    }
                }
                catch {
                    logger_1.logger.warn('Response could not be cached');
                }
            }
            return originalJson(body);
        };
        return next();
    };
};
exports.cache = cache;
