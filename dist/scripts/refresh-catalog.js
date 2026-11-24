"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_1 = require("../services/catalog");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
async function main() {
    if (!env_1.config.databaseUrl)
        throw new Error('DATABASE_URL is required for catalog refresh');
    try {
        await catalog_1.catalog.refreshCatalog();
        logger_1.logger.info('Catalog refresh complete');
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
void main().catch(() => {
    logger_1.logger.error('Catalog refresh failed; check database, migrations and upstream connectivity');
    process.exitCode = 1;
});
