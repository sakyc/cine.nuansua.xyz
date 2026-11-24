"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../config/logger");
const catalog_1 = require("../services/catalog");
const env_1 = require("../config/env");
const startCronJobs = () => {
    if (!env_1.config.databaseUrl) {
        logger_1.logger.warn('Catalog refresh disabled: DATABASE_URL is missing');
        return;
    }
    // Run every 30 minutes
    const refresh = async () => {
        logger_1.logger.info('Refreshing catalog snapshots');
        try {
            await catalog_1.catalog.refreshCatalog();
            logger_1.logger.info('Catalog refresh complete');
        }
        catch {
            logger_1.logger.warn('Catalog refresh failed; last successful data remains available');
        }
    };
    node_cron_1.default.schedule('*/30 * * * *', refresh, { timezone: 'UTC' });
    void refresh();
    logger_1.logger.info('Cron jobs initialized');
};
exports.startCronJobs = startCronJobs;
