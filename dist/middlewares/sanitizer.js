"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeResponse = void 0;
const sanitizeResponse = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        const sanitize = (obj, parentKey = null) => {
            if (typeof obj === 'string') {
                if (parentKey && ['poster', 'backdrop', 'trailer', 'url', 'thumbnail', 'id', 'slug'].includes(parentKey)) {
                    return obj;
                }
                if (/^https?:\/\/[^\s]+$/.test(obj) || /^\/api\//.test(obj))
                    return obj;
                return obj.replace(/lk21|layarkaca21/gi, '').replace(/\s{2,}/g, ' ').trim();
            }
            if (Array.isArray(obj)) {
                return obj.map(item => sanitize(item, parentKey));
            }
            if (obj !== null && typeof obj === 'object') {
                const newObj = {};
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        newObj[key] = sanitize(obj[key], key);
                    }
                }
                return newObj;
            }
            return obj;
        };
        return originalJson.call(this, sanitize(body));
    };
    next();
};
exports.sanitizeResponse = sanitizeResponse;
