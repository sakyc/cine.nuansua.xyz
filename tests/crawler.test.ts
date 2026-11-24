import { crawlCatalog } from '../src/services/CatalogCrawler';
import { catalog } from '../src/services/catalog';

const store = new Map<string, { data: Record<string, unknown>; updatedAt: Date }>();
jest.mock('../src/services/catalog', () => ({
  catalog: { crawlCategory: jest.fn() },
  catalogRepository: {
    getSnapshot: jest.fn(async (key: string) => store.get(key) ?? null),
    saveSnapshot: jest.fn(async (key: string, snapshot: { data: Record<string, unknown>; updatedAt: Date }) => { store.set(key, snapshot); return true; }),
  },
}));
jest.mock('../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const crawlCategory = catalog.crawlCategory as unknown as jest.Mock;
const options = { maxPages: 10, delayMs: 0, maxAgeMs: 1000 };
const newest = new Date().getUTCFullYear() + 1;

describe('catalog crawler', () => {
  beforeEach(() => { store.clear(); crawlCategory.mockReset(); });

  it('walks a year page by page, moves to the previous year on an empty page, and stores its position', async () => {
    // newest year: 2 full pages then empty; next year: pages keep coming.
    crawlCategory.mockImplementation(async (path: string, page: number) => ({
      items: path === `year/${newest}` && page > 2 ? 0 : 24, totalPages: 1, fetched: true,
    }));
    const stats = await crawlCatalog({ ...options, maxPages: 5 });
    expect(crawlCategory.mock.calls.map(([path, page]) => `${path}#${page}`)).toEqual([
      `year/${newest}#1`, `year/${newest}#2`, `year/${newest}#3`, `year/${newest - 1}#1`, `year/${newest - 1}#2`,
    ]);
    expect(stats?.cursor).toEqual({ year: newest - 1, page: 3 });
    expect(store.get('crawl:cursor')?.data).toEqual({ year: newest - 1, page: 3 });
  });

  it('continues from the stored position on the next run', async () => {
    store.set('crawl:cursor', { data: { year: 2001, page: 7 }, updatedAt: new Date() });
    crawlCategory.mockResolvedValue({ items: 24, totalPages: 1, fetched: false });
    await crawlCatalog({ ...options, maxPages: 1 });
    expect(crawlCategory).toHaveBeenCalledWith('year/2001', 7, 1000);
  });

  it('wraps to the newest year after the oldest one', async () => {
    store.set('crawl:cursor', { data: { year: 1970, page: 50 }, updatedAt: new Date() });
    crawlCategory.mockResolvedValue({ items: 24, totalPages: 50, fetched: false });
    const stats = await crawlCatalog({ ...options, maxPages: 1 });
    expect(stats?.cursor).toEqual({ year: newest, page: 1 });
  });

  it('stops after repeated failures and skips past a failing page', async () => {
    crawlCategory.mockRejectedValue(new Error('unreachable'));
    const stats = await crawlCatalog({ ...options, maxFailures: 3 });
    expect(stats).toMatchObject({ pages: 0, failures: 3 });
    expect(crawlCategory).toHaveBeenCalledTimes(3);
    expect(stats?.cursor).toEqual({ year: newest, page: 3 });
  });

  it('treats a missing page (404) as the end of that year', async () => {
    store.set('crawl:cursor', { data: { year: 2010, page: 21 }, updatedAt: new Date() });
    crawlCategory.mockRejectedValueOnce(Object.assign(new Error('Film / Series not found'), { status: 404 }))
      .mockResolvedValue({ items: 24, totalPages: 1, fetched: false });
    const stats = await crawlCatalog({ ...options, maxPages: 2 });
    expect(crawlCategory.mock.calls.map(([path, page]) => `${path}#${page}`)).toEqual(['year/2010#21', 'year/2009#1']);
    expect(stats).toMatchObject({ failures: 0, cursor: { year: 2009, page: 2 } });
  });

  it('ignores a corrupt stored position', async () => {
    store.set('crawl:cursor', { data: { year: 'x', page: -1 }, updatedAt: new Date() });
    crawlCategory.mockResolvedValue({ items: 0, totalPages: 1, fetched: false });
    await crawlCatalog({ ...options, maxPages: 1 });
    expect(crawlCategory).toHaveBeenCalledWith(`year/${newest}`, 1, 1000);
  });
});
