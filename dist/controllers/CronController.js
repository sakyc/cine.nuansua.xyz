"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCron = void 0;
const logger_1 = require("../config/logger");
const catalog_1 = require("../services/catalog");
const env_1 = require("../config/env");
const security_1 = require("../middlewares/security");
const runCron = async (req, res) => {
    try {
        if (!env_1.config.cronSecret) {
            return res.status(503).json({ success: false, message: 'Cron authentication is not configured' });
        }
        if (!(0, security_1.hasAdminSecret)(req)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        await catalog_1.catalog.refreshCatalog();
        res.status(200).json({ success: true, message: 'Cron job executed successfully' });
    }
    catch {
        logger_1.logger.error('Catalog cron refresh failed');
        res.status(500).json({ success: false, message: 'Cron job failed' });
    }
};
exports.runCron = runCron;
