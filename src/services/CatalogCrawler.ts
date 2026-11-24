import { catalog, catalogRepository } from './catalog';
import { logger } from '../config/logger';
import { isJsonObject } from '../types/catalog';

/**
 * Grows the searchable catalog by walking LK21's per-year listings (every film belongs to one year),
 * newest year first, a few pages per run. The position is stored so runs continue where the last
 * one stopped and start over after the oldest year. Pages indexed within `maxAgeMs` are skipped.
 */
const cursorKey = 'crawl:cursor';
const maxPagesPerListing = 50; // LK21 stops listings at page 50
export const oldestYear = 1970;
const newestYear = () => new Date().getUTCFullYear() + 1;

type Cursor = { year: number; page: number };
export type CrawlStats = { pages: number; fetched: number; items: number; failures: number; cursor: Cursor };

let running = false;

async function readCursor(): Promise<Cursor> {
  try {
    const stored = await catalogRepository.getSnapshot(cursorKey);
    const data = stored?.data;
    if (isJsonObject(data) && Number.isInteger(data.year) && Number.isInteger(data.page)) {
      const year = data.year as number; const page = data.page as number;
      if (year >= oldestYear && year <= newestYear() && page >= 1 && page <= maxPagesPerListing) return { year, page };
    }
  } catch { /* start from the newest year */ }
  return { year: newestYear(), page: 1 };
}

async function saveCursor(cursor: Cursor) {
  await catalogRepository.saveSnapshot(cursorKey, { data: cursor, updatedAt: new Date() }, []).catch(() => undefined);
}

const nextListing = (cursor: Cursor): Cursor => cursor.year > oldestYear
  ? { year: cursor.year - 1, page: 1 }
  : { year: newestYear(), page: 1 };

/**
 * Indexes up to `maxPages` listing pages, waiting `delayMs` after each upstream fetch so LK21 is not
 * hammered. Stops early after `maxFailures` consecutive errors (e.g. the source is unreachable).
 */
export async function crawlCatalog(options: { maxPages: number; delayMs: number; maxAgeMs: number; maxFailures?: number; log?: boolean }): Promise<CrawlStats | null> {
  if (running) return null;
  running = true;
  const stats: CrawlStats = { pages: 0, fetched: 0, items: 0, failures: 0, cursor: await readCursor() };
  let consecutiveFailures = 0;
  try {
    while (stats.pages < options.maxPages) {
      const { year, page } = stats.cursor;
      try {
        const result = await catalog.crawlCategory(`year/${year}`, page, options.maxAgeMs);
        stats.pages++;
        stats.items += result.items;
        consecutiveFailures = 0;
        if (result.fetched) {
          stats.fetched++;
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }
        // An empty page (or the listing cap) ends this year; otherwise continue to the next page.
        stats.cursor = result.items > 0 && page < maxPagesPerListing ? { year, page: page + 1 } : nextListing(stats.cursor);
      } catch (error) {
        // Past its last page LK21 redirects a listing to the home page, which the scraper reports as 404:
        // that is the end of this year, not a failure.
        if ((error as { status?: number })?.status === 404) {
          stats.pages++;
          consecutiveFailures = 0;
          stats.cursor = nextListing(stats.cursor);
          await saveCursor(stats.cursor);
          continue;
        }
        stats.failures++;
        consecutiveFailures++;
        if (consecutiveFailures >= (options.maxFailures ?? 5)) break;
        // Skip a page that keeps failing so one bad page cannot stall the crawl.
        stats.cursor = page < maxPagesPerListing ? { year, page: page + 1 } : nextListing(stats.cursor);
        await new Promise(resolve => setTimeout(resolve, options.delayMs * 2));
      }
      await saveCursor(stats.cursor);
      if (options.log && stats.pages % 25 === 0) logger.info('Catalog crawl progress', { ...stats.cursor, pages: stats.pages, fetched: stats.fetched });
    }
    return stats;
  } finally {
    running = false;
  }
}
