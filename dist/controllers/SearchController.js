"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const catalog_1 = require("../services/catalog");
const validation_1 = require("../services/validation");
const errors_1 = require("../services/errors");
const search = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ success: false, error: 'Query parameter q is required' });
        }
        const query = q.trim();
        if (query.length < 2 || query.length > 100 || !/[\p{L}\p{N}]/u.test(query)) {
            throw new errors_1.ServiceError(400, 'q must contain 2 to 100 characters and at least one letter or number');
        }
        const page = (0, validation_1.positiveInteger)(req.query.page, 1, 1000, 'page');
        const limit = (0, validation_1.positiveInteger)(req.query.limit, 20, 50, 'limit');
        const { results, total, meta } = await catalog_1.catalog.search(query, page, limit);
        res.json({
            success: true,
            query,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            results,
            meta,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.search = search;
