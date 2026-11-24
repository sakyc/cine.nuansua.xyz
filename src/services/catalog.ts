import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { PostgresCatalogRepository } from '../repositories/CatalogRepository';
import { HomeScraper } from '../scrapers/HomeScraper';
import { CategoryScraper } from '../scrapers/CategoryScraper';
import { MovieScraper } from '../scrapers/MovieScraper';
import { SeriesScraper } from '../scrapers/SeriesScraper';
import { CatalogService } from './CatalogService';

const home = new HomeScraper();
const category = new CategoryScraper();
const movie = new MovieScraper();
const series = new SeriesScraper();

export const catalog = new CatalogService(new PostgresCatalogRepository(prisma), {
  home: () => home.scrapeHome(),
  category: (path, page) => category.scrapeCategory(path, page),
  detail: (type, slug) => type === 'movie' ? movie.scrapeDetail(slug) : series.scrapeDetail(slug),
}, {
  homeTtlMs: config.catalogTtlSeconds * 1000,
  detailTtlMs: config.detailTtlSeconds * 1000,
  seedPages: config.catalogSeedPages,
});
