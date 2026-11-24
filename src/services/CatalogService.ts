import { CatalogRepository, StoredSnapshot } from '../repositories/CatalogRepository';
import {
  CatalogCard, CategorySnapshot, ContentType, DetailSnapshot, HomeSnapshot, JsonObject,
  homeSections, isCategorySnapshot, isDetailSnapshot, isHomeSnapshot,
} from '../types/catalog';
import { logger } from '../config/logger';
import { ServiceError } from './errors';

type Loaders = {
  home: () => Promise<unknown>;
  category: (path: string, page: number) => Promise<unknown>;
  detail: (type: ContentType, slug: string) => Promise<unknown>;
};
type Options = { homeTtlMs: number; detailTtlMs: number; seedPages: number; now?: () => number };
export type CatalogMeta = { source: 'catalog' | 'upstream'; stale: boolean; updatedAt: string };
type Result<T> = { data: T; meta: CatalogMeta };
type Resource<T extends JsonObject> = {
  key: string;
  ttl: number;
  load: () => Promise<unknown>;
  valid: (value: unknown) => value is T;
  cards: (value: T) => CatalogCard[];
  replacementValid?: (previous: T, next: T) => boolean;
};

export class CatalogService {
  private readonly snapshots = new Map<string, StoredSnapshot>();
  private readonly pending = new Map<string, Promise<StoredSnapshot>>();
  private readonly failures = new Map<string, { until: number; error: unknown }>();
  private readonly now: () => number;

  constructor(private readonly repository: CatalogRepository, private readonly loaders: Loaders, private readonly options: Options) {
    this.now = options.now || Date.now;
  }

  getHome(force = false): Promise<Result<HomeSnapshot>> {
    return this.resource({
      key: 'home', ttl: this.options.homeTtlMs, load: this.loaders.home, valid: isHomeSnapshot,
      cards: value => homeSections.flatMap(key => value[key]),
      replacementValid: (previous, next) => homeSections.every(key => !previous[key].length || next[key].length > 0),
    }, force);
  }

  getCategory(path: string, page: number, force = false): Promise<Result<CategorySnapshot>> {
    return this.resource({
      key: `category:${path}:${page}`, ttl: this.options.homeTtlMs,
      load: () => this.loaders.category(path, page), valid: isCategorySnapshot, cards: value => value.items,
      replacementValid: (previous, next) => !previous.items.length || next.items.length > 0,
    }, force);
  }

  getDetail(type: ContentType, slug: string): Promise<Result<DetailSnapshot>> {
    return this.resource({
      key: `detail:${type}:${slug}`, ttl: this.options.detailTtlMs,
      load: () => this.loaders.detail(type, slug),
      valid: (value): value is DetailSnapshot => isDetailSnapshot(value) && value.id === slug,
      cards: () => [],
    });
  }

  async search(query: string, page: number, limit: number) {
    const home = await this.getHome();
    try {
      const result = await this.repository.search(query, page, limit);
      return { ...result, meta: { ...home.meta, source: 'catalog' as const } };
    } catch {
      logger.error('Catalog search storage unavailable');
      throw new ServiceError(503, 'Catalog search is temporarily unavailable');
    }
  }

  async refreshCatalog() {
    await this.getHome(true);
    for (let page = 1; page <= this.options.seedPages; page++) {
      await this.getCategory('populer', page, true);
    }
  }

  private remember<T>(map: Map<string, T>, key: string, value: T) {
    map.delete(key);
    map.set(key, value);
    if (map.size > 200) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
  }

  private async stored<T extends JsonObject>(resource: Resource<T>): Promise<StoredSnapshot | null> {
    const cached = this.snapshots.get(resource.key);
    if (cached) return cached;
    try {
      const snapshot = await this.repository.getSnapshot(resource.key);
      if (snapshot && resource.valid(snapshot.data)) {
        this.remember(this.snapshots, resource.key, snapshot);
        return snapshot;
      }
      if (snapshot) logger.warn('Ignoring invalid catalog snapshot', { key: resource.key });
      return null;
    } catch {
      logger.error('Catalog storage unavailable', { key: resource.key });
      throw new ServiceError(503, 'Catalog database is unavailable; configure DATABASE_URL and apply migrations');
    }
  }

  private async resource<T extends JsonObject>(resource: Resource<T>, force = false): Promise<Result<T>> {
    const previous = await this.stored(resource);
    if (previous && !force && resource.valid(previous.data)) {
      const stale = this.now() - previous.updatedAt.getTime() >= resource.ttl;
      if (stale) {
        // Serve the last good snapshot immediately; failed refreshes leave it intact.
        void this.refresh(resource, previous).catch(() => {});
      }
      return { data: previous.data, meta: { source: 'catalog', stale, updatedAt: previous.updatedAt.toISOString() } };
    }

    const snapshot = await this.refresh(resource, previous);
    if (!resource.valid(snapshot.data)) throw new ServiceError(502, 'Invalid catalog response');
    return { data: snapshot.data, meta: { source: 'upstream', stale: false, updatedAt: snapshot.updatedAt.toISOString() } };
  }

  private refresh<T extends JsonObject>(resource: Resource<T>, previous: StoredSnapshot | null): Promise<StoredSnapshot> {
    const pending = this.pending.get(resource.key);
    if (pending) return pending;
    const failure = this.failures.get(resource.key);
    if (failure && failure.until > this.now()) return Promise.reject(failure.error);
    if (this.pending.size >= 8) return Promise.reject(new ServiceError(503, 'Catalog refresh is busy; retry shortly'));

    const startedAt = new Date(this.now());
    const work = (async () => {
      const data = await resource.load();
      if (!resource.valid(data)) throw new ServiceError(502, 'Upstream catalog structure is invalid; previous data retained');
      if (previous && resource.valid(previous.data) && resource.replacementValid && !resource.replacementValid(previous.data, data)) {
        throw new ServiceError(502, 'Upstream catalog is incomplete; previous data retained');
      }
      const snapshot = { data, updatedAt: startedAt };
      let latest: StoredSnapshot | null;
      try {
        const saved = await this.repository.saveSnapshot(resource.key, snapshot, resource.cards(data));
        latest = saved ? snapshot : await this.repository.getSnapshot(resource.key);
      } catch {
        throw new ServiceError(503, 'Catalog snapshot could not be saved');
      }
      if (!latest || !resource.valid(latest.data)) throw new ServiceError(503, 'Catalog snapshot could not be saved');
      this.remember(this.snapshots, resource.key, latest);
      this.failures.delete(resource.key);
      return latest;
    })().catch((error: unknown) => {
      this.remember(this.failures, resource.key, { until: this.now() + 30000, error });
      logger.warn('Catalog refresh failed; retaining previous data', { key: resource.key, reason: error instanceof Error ? error.name : 'unknown' });
      throw error;
    }).finally(() => { this.pending.delete(resource.key); });
    this.pending.set(resource.key, work);
    return work;
  }
}
