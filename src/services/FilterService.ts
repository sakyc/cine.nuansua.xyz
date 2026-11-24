import { CategoryScraper, FilterOptions } from '../scrapers/CategoryScraper';
import { DramaScraper } from '../scrapers/DramaScraper';
import { catalogRepository } from './catalog';
import { ServiceError } from './errors';
import { logger } from '../config/logger';

/**
 * Genre/country/year choices for the browse page, per site ("movie" = LK21, "drama" = series site).
 * Kept in memory for a day and stored in the database as a fallback when the source is unreachable.
 */
const lifetime = 24 * 60 * 60_000;
const scrapers = { movie: new CategoryScraper(), drama: new DramaScraper() };
const memory = new Map<string, { data: FilterOptions; expires: number }>();
export type FilterSite = keyof typeof scrapers;

const valid = (value: unknown): value is FilterOptions => {
  const data = value as FilterOptions;
  return !!data && Array.isArray(data.genres) && Array.isArray(data.countries) && Array.isArray(data.years) && data.genres.length > 0;
};

export async function getFilterOptions(site: FilterSite): Promise<FilterOptions> {
  const now = Date.now();
  const cached = memory.get(site);
  if (cached && cached.expires > now) return cached.data;
  const key = `filters:${site}`;
  const stored = await catalogRepository.getSnapshot(key).catch(() => null);
  if (stored && valid(stored.data) && now - stored.updatedAt.getTime() < lifetime) {
    memory.set(site, { data: stored.data, expires: stored.updatedAt.getTime() + lifetime });
    return stored.data;
  }
  try {
    const data = await scrapers[site].scrapeFilterOptions();
    if (!valid(data)) throw new ServiceError(502, 'Filter options are unavailable');
    memory.set(site, { data, expires: now + lifetime });
    await catalogRepository.saveSnapshot(key, { data: data as never, updatedAt: new Date(now) }, []).catch(() => undefined);
    return data;
  } catch (error) {
    if (stored && valid(stored.data)) {
      logger.warn('Using stored filter options; source unavailable', { site });
      return stored.data;
    }
    throw error instanceof ServiceError ? error : new ServiceError(502, 'Filter options are unavailable');
  }
}
