"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootCategoryMovies = exports.getCategoryMovies = void 0;
const catalog_1 = require("../services/catalog");
const validation_1 = require("../services/validation");
// Handles genre, country, year
const getCategoryMovies = async (req, res, next) => {
    try {
        let { category, slug } = req.params; // category can be 'genre', 'country', 'years'
        slug = (0, validation_1.slugParameter)(slug);
        const page = (0, validation_1.positiveInteger)(req.query.page, 1, 1000, 'page');
        // LK21 uses 'year' not 'years'
        if (category === 'years')
            category = 'year';
        // Construct path for LK21. e.g., 'genre/action' or 'country/indonesia'
        const path = `${category}/${slug}`;
        const { data, meta } = await catalog_1.catalog.getCategory(path, page);
        res.json({ success: true, ...data, meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getCategoryMovies = getCategoryMovies;
// Handles root categories like popular, rating, release, etc.
const getRootCategoryMovies = async (req, res, next) => {
    try {
        const slug = (0, validation_1.slugParameter)(req.params.slug);
        const page = (0, validation_1.positiveInteger)(req.query.page, 1, 1000, 'page');
        const { data, meta } = await catalog_1.catalog.getCategory(slug, page);
        res.json({ success: true, ...data, meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getRootCategoryMovies = getRootCategoryMovies;
