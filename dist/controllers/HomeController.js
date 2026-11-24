"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComedy = exports.getSeriesUpdate = exports.getFilmUnggulan = exports.getIndia = exports.getThailand = exports.getKorea = exports.getRomance = exports.getHorror = exports.getDrakor = exports.getAction = exports.getFamily = exports.getRecommendations = exports.getTopMonth = exports.getLatestSeries = exports.getLatestMovies = exports.getHome = void 0;
const catalog_1 = require("../services/catalog");
const getHome = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                filmUnggulan: "/api/home/film-unggulan",
                latestMovies: "/api/home/latest-movies",
                latestSeries: "/api/home/latest-series",
                seriesUpdate: "/api/home/series-update",
                topMonth: "/api/home/top-month",
                recommendations: "/api/home/recommendations",
                family: "/api/home/family",
                action: "/api/home/action",
                drakor: "/api/home/drakor",
                horror: "/api/home/horror",
                comedy: "/api/home/comedy",
                korea: "/api/home/korea",
                thailand: "/api/home/thailand",
                india: "/api/home/india",
                navigation: {
                    genre: "/api/home/genre",
                    country: "/api/home/country",
                    years: "/api/home/years",
                    series: "/api/home/series",
                    populer: "/api/home/populer"
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getHome = getHome;
const getSection = (section) => async (req, res, next) => {
    try {
        const result = await catalog_1.catalog.getHome();
        res.json({ success: true, data: result.data[section], meta: result.meta });
    }
    catch (error) {
        next(error);
    }
};
exports.getLatestMovies = getSection('latestMovies');
exports.getLatestSeries = getSection('latestSeries');
exports.getTopMonth = getSection('topMonth');
exports.getRecommendations = getSection('recommendations');
exports.getFamily = getSection('family');
exports.getAction = getSection('action');
exports.getDrakor = getSection('drakor');
exports.getHorror = getSection('horror');
exports.getRomance = getSection('romance');
exports.getKorea = getSection('korea');
exports.getThailand = getSection('thailand');
exports.getIndia = getSection('india');
exports.getFilmUnggulan = getSection('filmUnggulan');
exports.getSeriesUpdate = getSection('seriesUpdate');
exports.getComedy = getSection('comedy');
