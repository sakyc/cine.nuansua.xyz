import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PostgresCatalogRepository } from '../src/repositories/CatalogRepository';
import { CatalogService } from '../src/services/CatalogService';
import { CatalogCard, emptyExtraDetails } from '../src/types/catalog';

jest.mock('../src/config/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

integration('PostgreSQL catalog integration', () => {
  const marker = `test${randomUUID().replace(/-/g, '')}`;
  let db: PrismaClient;
  let repository: PostgresCatalogRepository;
  const keys: string[] = [];
  const card = (suffix: string, title: string): CatalogCard => ({
    ...emptyExtraDetails(), id: `${marker}-${suffix}`, slug: `${marker}-${suffix}`, title: `${marker} ${title}`,
    type: 'movie', year: 2022, poster: '', rating: null, duration: null, genre: null,
  });

  beforeAll(() => {
    db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
    repository = new PostgresCatalogRepository(db);
  });

  afterAll(async () => {
    await db.catalogSnapshot.deleteMany({ where: { key: { in: keys } } });
    await db.catalogEntry.deleteMany({ where: { slug: { startsWith: marker } } });
    await db.$disconnect();
  });

  it('persists JSON, performs case-insensitive prefix search and paginates deterministically', async () => {
    const key = `${marker}:search`;
    keys.push(key);
    const cards = [card('batman', 'The Batman'), card('batgirl', 'Batgirl'), card('other', 'Another Film')];
    await repository.saveSnapshot(key, { data: { items: cards }, updatedAt: new Date() }, cards);
    expect((await repository.getSnapshot(key))?.data.items).toEqual(cards);
    const first = await repository.search(`${marker} BAT`, 1, 1);
    const second = await repository.search(`${marker} bat`, 2, 1);
    expect(first.total).toBe(2);
    expect(second.total).toBe(2);
    expect(first.results).toHaveLength(1);
    expect(first.results[0].slug).not.toBe(second.results[0].slug);
    expect((await repository.search(`${marker} bat`, 3, 1)).results).toEqual([]);
  });

  it('does not overwrite a newer snapshot or its catalog entries with an older refresh', async () => {
    const key = `${marker}:ordering`;
    keys.push(key);
    const current = card('ordering', 'Current Title');
    const newer = { data: { items: [current] }, updatedAt: new Date('2026-11-24T10:00:00Z') };
    await repository.saveSnapshot(key, newer, [current]);
    const old = { ...current, title: `${marker} Old Title` };
    expect(await repository.saveSnapshot(key, { data: { items: [old] }, updatedAt: new Date('2026-11-24T09:00:00Z') }, [old])).toBe(false);
    expect((await repository.getSnapshot(key))?.data).toEqual(newer.data);
    expect((await repository.search(`${marker} Current`, 1, 20)).total).toBe(1);
  });

  it('parameterizes hostile input rather than interpreting it as SQL', async () => {
    expect((await repository.search(`${marker}' OR 1=1 --`, 1, 20)).results).toEqual([]);
    expect(await db.catalogEntry.count({ where: { slug: { startsWith: marker } } })).toBeGreaterThan(0);
  });

  it('has the full-text index used by the search expression', async () => {
    const rows = await db.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema()
        AND indexname = 'CatalogEntry_title_search_idx'`;
    expect(rows[0].indexdef).toContain('USING gin');
    expect(rows[0].indexdef).toContain('to_tsvector');
  });

  it('restores a persisted detail after restart while its source is unavailable', async () => {
    const slug = `${marker}-offline`;
    const key = `detail:movie:${slug}`;
    keys.push(key);
    const detail = { id: slug, title: 'Persisted detail', streamembed: [] };
    const updatedAt = new Date('2026-11-24T09:00:00Z');
    await repository.saveSnapshot(key, { data: detail, updatedAt }, []);
    const unavailable = jest.fn().mockRejectedValue(new Error('Source offline'));
    const catalog = new CatalogService(new PostgresCatalogRepository(db), {
      home: unavailable, category: unavailable, detail: unavailable,
    }, { homeTtlMs: 1000, detailTtlMs: 1000, seedPages: 0, now: () => updatedAt.getTime() + 2000 });
    const result = await catalog.getDetail('movie', slug);
    expect(result.data).toEqual(detail);
    expect(result.meta).toEqual({ source: 'catalog', stale: true, updatedAt: updatedAt.toISOString() });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect((await repository.getSnapshot(key))?.data).toEqual(detail);
  });
});
