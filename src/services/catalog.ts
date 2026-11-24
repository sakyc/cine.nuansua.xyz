import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { PostgresCatalogRepository } from '../repositories/CatalogRepository';
import { HomeScraper } from '../scrapers/HomeScraper';
import { CategoryScraper } from '../scrapers/CategoryScraper';
import { MovieScraper } from '../scrapers/MovieScraper';
import { SeriesScraper } from '../scrapers/SeriesScraper';
import { DramaScraper } from '../scrapers/DramaScraper';
import { CatalogService } from './CatalogService';

const home = new HomeScraper();
const category = new CategoryScraper();
const movie = new MovieScraper();
const series = new SeriesScraper();
const drama = new DramaScraper();

// Series and their episodes live on LK21's series site; the old LK21 series page is a fallback.
const seriesDetail = (slug: string) => drama.scrapeSeries(slug).catch(() => series.scrapeDetail(slug));

export const catalogRepository = new PostgresCatalogRepository(prisma);

export const catalog = new CatalogService(catalogRepository, {
  home: () => home.scrapeHome(),
  // "drama/<path>" listings come from the series site (e.g. drama/country/south-korea for drakor).
  category: (path, page) => path.startsWith('drama/') ? drama.scrapeListing(path.slice('drama/'.length), page) : category.scrapeCategory(path, page),
  detail: (type, slug) => type === 'movie' ? movie.scrapeDetail(slug) : type === 'episode' ? drama.scrapeEpisode(slug) : seriesDetail(slug),
}, {
  homeTtlMs: config.catalogTtlSeconds * 1000,
  detailTtlMs: config.detailTtlSeconds * 1000,
  seedPages: config.catalogSeedPages,
});
