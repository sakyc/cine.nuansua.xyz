"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalog = void 0;
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const CatalogRepository_1 = require("../repositories/CatalogRepository");
const HomeScraper_1 = require("../scrapers/HomeScraper");
const CategoryScraper_1 = require("../scrapers/CategoryScraper");
const MovieScraper_1 = require("../scrapers/MovieScraper");
const SeriesScraper_1 = require("../scrapers/SeriesScraper");
const CatalogService_1 = require("./CatalogService");
const home = new HomeScraper_1.HomeScraper();
const category = new CategoryScraper_1.CategoryScraper();
const movie = new MovieScraper_1.MovieScraper();
const series = new SeriesScraper_1.SeriesScraper();
exports.catalog = new CatalogService_1.CatalogService(new CatalogRepository_1.PostgresCatalogRepository(prisma_1.prisma), {
    home: () => home.scrapeHome(),
    category: (path, page) => category.scrapeCategory(path, page),
    detail: (type, slug) => type === 'movie' ? movie.scrapeDetail(slug) : series.scrapeDetail(slug),
}, {
    homeTtlMs: env_1.config.catalogTtlSeconds * 1000,
    detailTtlMs: env_1.config.detailTtlSeconds * 1000,
    seedPages: env_1.config.catalogSeedPages,
});
