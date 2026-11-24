"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesEpisodes = exports.getSeriesSeasons = exports.getSeries = void 0;
const catalog_1 = require("../services/catalog");
const validation_1 = require("../services/validation");
const catalog_2 = require("../types/catalog");
const getSeries = async (req, res, next) => {
    try {
        const { data, meta } = await catalog_1.catalog.getDetail('series', (0, validation_1.slugParameter)(req.params.id));
        res.json({ success: true, data, meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getSeries = getSeries;
const getSeriesSeasons = async (req, res, next) => {
    try {
        const { data, meta } = await catalog_1.catalog.getDetail('series', (0, validation_1.slugParameter)(req.params.id));
        res.json({ success: true, data: Array.isArray(data.seasons) ? data.seasons : [], meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getSeriesSeasons = getSeriesSeasons;
const getSeriesEpisodes = async (req, res, next) => {
    try {
        const { data, meta } = await catalog_1.catalog.getDetail('series', (0, validation_1.slugParameter)(req.params.id));
        const episodes = Array.isArray(data.seasons)
            ? data.seasons.flatMap(season => (0, catalog_2.isJsonObject)(season) && Array.isArray(season.episodes) ? season.episodes : []) : [];
        res.json({ success: true, data: episodes, meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getSeriesEpisodes = getSeriesEpisodes;
