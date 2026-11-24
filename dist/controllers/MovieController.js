"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMovieCast = exports.getMovie = void 0;
const catalog_1 = require("../services/catalog");
const validation_1 = require("../services/validation");
const getMovie = async (req, res, next) => {
    try {
        const { data, meta } = await catalog_1.catalog.getDetail('movie', (0, validation_1.slugParameter)(req.params.id));
        res.json({ success: true, data, meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getMovie = getMovie;
const getMovieCast = async (req, res, next) => {
    try {
        const { data, meta } = await catalog_1.catalog.getDetail('movie', (0, validation_1.slugParameter)(req.params.id));
        res.json({ success: true, data: Array.isArray(data.cast) ? data.cast : [], meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getMovieCast = getMovieCast;
