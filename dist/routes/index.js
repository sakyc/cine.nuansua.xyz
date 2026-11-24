"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HomeController_1 = require("../controllers/HomeController");
const SearchController_1 = require("../controllers/SearchController");
const MovieController_1 = require("../controllers/MovieController");
const SeriesController_1 = require("../controllers/SeriesController");
const PersonController_1 = require("../controllers/PersonController");
const GenreController_1 = require("../controllers/GenreController");
const NavigationController_1 = require("../controllers/NavigationController");
const CategoryController_1 = require("../controllers/CategoryController");
const MiscController_1 = require("../controllers/MiscController");
const cache_1 = require("../middlewares/cache");
const CronController_1 = require("../controllers/CronController");
const playback = __importStar(require("../controllers/PlaybackController"));
const subtitles = __importStar(require("../controllers/SubtitleController"));
const router = (0, express_1.Router)();
router.get('/cron', CronController_1.runCron);
router.post('/playback/:type/:slug', playback.create);
router.get('/playback/:token/playlist.m3u8', playback.playlist);
router.get('/playback/:token/segment/:index', playback.segment);
router.get('/subtitles/:type/:slug', subtitles.search);
router.post('/subtitles/movie/:slug/:token', subtitles.download);
router.get('/home', HomeController_1.getHome);
router.get('/home/film-unggulan', HomeController_1.getFilmUnggulan);
router.get('/home/latest-movies', HomeController_1.getLatestMovies);
router.get('/home/latest-series', HomeController_1.getLatestSeries);
router.get('/home/series-update', HomeController_1.getSeriesUpdate);
router.get('/home/top-month', HomeController_1.getTopMonth);
router.get('/home/recommendations', HomeController_1.getRecommendations);
router.get('/home/family', HomeController_1.getFamily);
router.get('/home/action', HomeController_1.getAction);
router.get('/home/drakor', HomeController_1.getDrakor);
router.get('/home/horror', HomeController_1.getHorror);
router.get('/home/romance', HomeController_1.getRomance);
router.get('/home/comedy', HomeController_1.getComedy);
router.get('/home/korea', HomeController_1.getKorea);
router.get('/home/thailand', HomeController_1.getThailand);
router.get('/home/india', HomeController_1.getIndia);
router.get('/search', SearchController_1.search);
router.get('/movie/:id', MovieController_1.getMovie);
router.get('/movie/:id/cast', MovieController_1.getMovieCast);
router.get('/series/:id', SeriesController_1.getSeries);
router.get('/series/:id/seasons', SeriesController_1.getSeriesSeasons);
router.get('/series/:id/episodes', SeriesController_1.getSeriesEpisodes);
router.get('/person/:id', (0, cache_1.cache)(86400), PersonController_1.getPerson);
router.get('/actors/popular', (0, cache_1.cache)(86400), PersonController_1.getPopularActors);
// Navigation & Menus
router.get('/home/navigation', (0, cache_1.cache)(86400), NavigationController_1.getAllNavigation);
router.get('/home/genre', (0, cache_1.cache)(86400), NavigationController_1.getGenres);
router.get('/home/country', (0, cache_1.cache)(86400), NavigationController_1.getCountries);
router.get('/home/years', (0, cache_1.cache)(86400), NavigationController_1.getYears);
router.get('/home/series', (0, cache_1.cache)(86400), NavigationController_1.getSeriesMenu);
router.get('/home/populer', (0, cache_1.cache)(86400), NavigationController_1.getPopularMenu);
// Category Movies
router.get('/home/:category(genre|country|years)/:slug', CategoryController_1.getCategoryMovies);
router.get('/home/series/:slug', CategoryController_1.getRootCategoryMovies);
router.get('/home/populer/:slug', CategoryController_1.getRootCategoryMovies);
// Legacy backward compatibility if needed, but the above are the main ones now
router.get('/genre/:slug/movies', (0, cache_1.cache)(3600), GenreController_1.getMoviesByGenre);
router.get('/top-box-office', (0, cache_1.cache)(3600), MiscController_1.getTopBoxOffice);
router.get('/coming-soon', (0, cache_1.cache)(3600), MiscController_1.getComingSoon);
router.get('/news', (0, cache_1.cache)(3600), MiscController_1.getNews);
router.get('/trailers', (0, cache_1.cache)(3600), MiscController_1.getTrailers);
router.get('/health', MiscController_1.getHealth);
router.get('/debug/upstream', MiscController_1.getDebugUpstream);
exports.default = router;
