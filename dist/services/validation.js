"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.positiveInteger = exports.slugParameter = void 0;
const errors_1 = require("./errors");
const slugParameter = (value) => {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(value)) {
        throw new errors_1.ServiceError(400, 'Invalid content slug');
    }
    return value;
};
exports.slugParameter = slugParameter;
const positiveInteger = (value, fallback, max, name) => {
    if (value === undefined)
        return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value))
        throw new errors_1.ServiceError(400, `${name} must be a positive integer`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
        throw new errors_1.ServiceError(400, `${name} must be between 1 and ${max}`);
    }
    return parsed;
};
exports.positiveInteger = positiveInteger;
