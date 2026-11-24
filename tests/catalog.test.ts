import { CatalogService } from '../src/services/CatalogService';
import { MemoryCatalogRepository } from './helpers/MemoryCatalogRepository';
import { HomeSnapshot, CatalogCard, emptyExtraDetails, homeSections } from '../src/types/catalog';

jest.mock('../src/config/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const card: CatalogCard = {
  ...emptyExtraDetails(), id: 'batman-2022', slug: 'batman-2022', type: 'movie', title: 'The Batman',
  year: 2022, poster: '', rating: 8, duration: null, genre: null,
};
const home = (): HomeSnapshot => ({
  filmUnggulan: [], latestMovies: [card], latestSeries: [], seriesUpdate: [], topMonth: [],
  recommendations: [], family: [], action: [], drakor: [], horror: [], romance: [],
  comedy: [], korea: [], thailand: [], india: [],
});
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

let clock: number;
let repository: MemoryCatalogRepository;
let loaders: { home: jest.Mock<Promise<unknown>, []>; category: jest.Mock<Promise<unknown>, [string, number]>; detail: jest.Mock<Promise<unknown>, [string, string]> };
const service = () => new CatalogService(repository, loaders, { homeTtlMs: 1000, detailTtlMs: 1000, seedPages: 0, now: () => clock });

beforeEach(() => {
  clock = 100000;
  repository = new MemoryCatalogRepository();
  loaders = {
    home: jest.fn().mockResolvedValue(home()),
    category: jest.fn().mockResolvedValue({ page: 1, totalPages: 1, items: [card] }),
    detail: jest.fn().mockResolvedValue({ id: card.slug, title: card.title, streamembed: [] }),
  };
});

it('persists one home fetch and serves all subsequent reads without upstream access', async () => {
  const catalog = service();
  expect((await catalog.getHome()).meta.source).toBe('upstream');
  expect((await catalog.getHome()).meta.source).toBe('catalog');
  expect(loaders.home).toHaveBeenCalledTimes(1);
  expect(repository.entries.size).toBe(1);
});

it('coalesces concurrent cold requests into one fetch', async () => {
  const catalog = service();
  const results = await Promise.all(Array.from({ length: 20 }, () => catalog.getHome()));
  expect(results).toHaveLength(20);
  expect(loaders.home).toHaveBeenCalledTimes(1);
});

it('returns stale data immediately while refresh is still pending', async () => {
  const catalog = service();
  await catalog.getHome();
  clock += 2000;
  let finish: ((value: unknown) => void) | undefined;
  loaders.home.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const stale = await catalog.getHome();
  expect(stale.meta.stale).toBe(true);
  expect(stale.data.latestMovies[0].title).toBe(card.title);
  finish?.(home());
  await flush();
});

it('retains last good data after failure and backs off subsequent refresh attempts', async () => {
  const catalog = service();
  await catalog.getHome();
  clock += 2000;
  loaders.home.mockRejectedValue(new Error('Upstream offline'));
  expect((await catalog.getHome()).meta.stale).toBe(true);
  await flush();
  await catalog.getHome();
  expect(loaders.home).toHaveBeenCalledTimes(2);
  expect(repository.snapshots.get('home')?.updatedAt.getTime()).toBe(100000);
});

it('survives a service restart with upstream unavailable', async () => {
  await service().getHome();
  clock += 2000;
  loaders.home.mockRejectedValue(new Error('Blocked'));
  const result = await service().getHome();
  expect(result.data.latestMovies).toEqual([card]);
  expect(result.meta.stale).toBe(true);
  await flush();
});

it('rejects empty/invalid scrapes without replacing stored data', async () => {
  const catalog = service();
  await catalog.getHome();
  loaders.home.mockResolvedValue(Object.fromEntries(homeSections.map(key => [key, []])));
  await expect(catalog.getHome(true)).rejects.toMatchObject({ status: 502 });
  expect(repository.entries.size).toBe(1);
  expect(repository.snapshots.get('home')?.data.latestMovies).toEqual([card]);
});

it('rejects partial section loss while retaining the entire previous snapshot', async () => {
  const initial = home();
  initial.action = [card];
  loaders.home.mockResolvedValueOnce(initial);
  const catalog = service();
  await catalog.getHome();
  await expect(catalog.getHome(true)).rejects.toMatchObject({ status: 502 });
  expect(repository.snapshots.get('home')?.data.action).toEqual([card]);
});

it('fails explicitly when cold and upstream is unavailable', async () => {
  loaders.home.mockRejectedValue(Object.assign(new Error('Unavailable'), { status: 502 }));
  await expect(service().getHome()).rejects.toMatchObject({ status: 502 });
  expect(repository.entries.size).toBe(0);
});

it('searches the saved catalog while upstream is offline', async () => {
  const catalog = service();
  await catalog.getHome();
  loaders.home.mockRejectedValue(new Error('Offline'));
  const result = await catalog.search('batman', 1, 20);
  expect(result.total).toBe(1);
  expect(result.results).toEqual([card]);
  expect(loaders.home).toHaveBeenCalledTimes(1);
});

it('shares cached detail across repeat requests and preserves it after expiry', async () => {
  const catalog = service();
  await catalog.getDetail('movie', card.slug);
  await catalog.getDetail('movie', card.slug);
  expect(loaders.detail).toHaveBeenCalledTimes(1);
  clock += 2000;
  loaders.detail.mockRejectedValue(new Error('Offline'));
  expect((await catalog.getDetail('movie', card.slug)).meta.stale).toBe(true);
  await flush();
});

it('does not replace a non-empty category with a suspicious empty scrape', async () => {
  const catalog = service();
  await catalog.getCategory('genre/action', 1);
  loaders.category.mockResolvedValue({ page: 1, totalPages: 1, items: [] });
  await expect(catalog.getCategory('genre/action', 1, true)).rejects.toMatchObject({ status: 502 });
  expect(repository.entries.size).toBe(1);
});

it('returns a clear service error when the catalog database is unavailable', async () => {
  jest.spyOn(repository, 'getSnapshot').mockRejectedValue(new Error('DB offline'));
  await expect(service().getHome()).rejects.toMatchObject({ status: 503 });
  expect(loaders.home).not.toHaveBeenCalled();
});

it('returns a safe error when a cold snapshot cannot be persisted', async () => {
  jest.spyOn(repository, 'saveSnapshot').mockRejectedValue(new Error('Sensitive connection error'));
  await expect(service().getHome()).rejects.toMatchObject({ status: 503, message: 'Catalog snapshot could not be saved' });
});

it('retains previous data when persisting a refresh fails', async () => {
  const catalog = service();
  await catalog.getHome();
  clock += 2000;
  jest.spyOn(repository, 'saveSnapshot').mockRejectedValue(new Error('Storage offline'));
  const response = await catalog.getHome();
  expect(response.data.latestMovies).toEqual([card]);
  expect(response.meta.stale).toBe(true);
  await flush();
  expect(repository.snapshots.get('home')?.updatedAt.getTime()).toBe(100000);
});
