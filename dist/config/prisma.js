"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const env_1 = require("./env");
let prisma;
if (!env_1.config.databaseUrl) {
    logger_1.logger.warn('DATABASE_URL not set, Prisma disabled');
    exports.prisma = prisma = new Proxy({}, {
        get: () => {
            throw Object.assign(new Error('Catalog database is not configured'), { status: 503 });
        },
    });
}
else {
    exports.prisma = prisma = new client_1.PrismaClient();
}
