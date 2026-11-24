"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogService = void 0;
const catalog_1 = require("../types/catalog");
const logger_1 = require("../config/logger");
const errors_1 = require("./errors");
class CatalogService {
    repository;
    loaders;
    options;
    snapshots = new Map();
    pending = new Map();
    failures = new Map();
    now;
    constructor(repository, loaders, options) {
        this.repository = repository;
        this.loaders = loaders;
        this.options = options;
        this.now = options.now || Date.now;
    }
    getHome(force = false) {
        return this.resource({
            key: 'home', ttl: this.options.homeTtlMs, load: this.loaders.home, valid: catalog_1.isHomeSnapshot,
            cards: value => catalog_1.homeSections.flatMap(key => value[key]),
            replacementValid: (previous, next) => catalog_1.homeSections.every(key => !previous[key].length || next[key].length > 0),
        }, force);
    }
    getCategory(path, page, force = false) {
        return this.resource({
            key: `category:${path}:${page}`, ttl: this.options.homeTtlMs,
            load: () => this.loaders.category(path, page), valid: catalog_1.isCategorySnapshot, cards: value => value.items,
            replacementValid: (previous, next) => !previous.items.length || next.items.length > 0,
        }, force);
    }
    getDetail(type, slug) {
        return this.resource({
            key: `detail:${type}:${slug}`, ttl: this.options.detailTtlMs,
            load: () => this.loaders.detail(type, slug),
            valid: (value) => (0, catalog_1.isDetailSnapshot)(value) && value.id === slug,
            cards: () => [],
        });
    }
    async search(query, page, limit) {
        const home = await this.getHome();
        try {
            const result = await this.repository.search(query, page, limit);
            return { ...result, meta: { ...home.meta, source: 'catalog' } };
        }
        catch {
            logger_1.logger.error('Catalog search storage unavailable');
            throw new errors_1.ServiceError(503, 'Catalog search is temporarily unavailable');
        }
    }
    async refreshCatalog() {
        await this.getHome(true);
        for (let page = 1; page <= this.options.seedPages; page++) {
            await this.getCategory('populer', page, true);
        }
    }
    remember(map, key, value) {
        map.delete(key);
        map.set(key, value);
        if (map.size > 200) {
            const oldest = map.keys().next().value;
            if (oldest !== undefined)
                map.delete(oldest);
        }
    }
    async stored(resource) {
        const cached = this.snapshots.get(resource.key);
        if (cached)
            return cached;
        try {
            const snapshot = await this.repository.getSnapshot(resource.key);
            if (snapshot && resource.valid(snapshot.data)) {
                this.remember(this.snapshots, resource.key, snapshot);
                return snapshot;
            }
            if (snapshot)
                logger_1.logger.warn('Ignoring invalid catalog snapshot', { key: resource.key });
            return null;
        }
        catch {
            logger_1.logger.error('Catalog storage unavailable', { key: resource.key });
            throw new errors_1.ServiceError(503, 'Catalog database is unavailable; configure DATABASE_URL and apply migrations');
        }
    }
    async resource(resource, force = false) {
        const previous = await this.stored(resource);
        if (previous && !force && resource.valid(previous.data)) {
            const stale = this.now() - previous.updatedAt.getTime() >= resource.ttl;
            if (stale) {
                // Serve the last good snapshot immediately; failed refreshes leave it intact.
                void this.refresh(resource, previous).catch(() => { });
            }
            return { data: previous.data, meta: { source: 'catalog', stale, updatedAt: previous.updatedAt.toISOString() } };
        }
        const snapshot = await this.refresh(resource, previous);
        if (!resource.valid(snapshot.data))
            throw new errors_1.ServiceError(502, 'Invalid catalog response');
        return { data: snapshot.data, meta: { source: 'upstream', stale: false, updatedAt: snapshot.updatedAt.toISOString() } };
    }
    refresh(resource, previous) {
        const pending = this.pending.get(resource.key);
        if (pending)
            return pending;
        const failure = this.failures.get(resource.key);
        if (failure && failure.until > this.now())
            return Promise.reject(failure.error);
        if (this.pending.size >= 8)
            return Promise.reject(new errors_1.ServiceError(503, 'Catalog refresh is busy; retry shortly'));
        const startedAt = new Date(this.now());
        const work = (async () => {
            const data = await resource.load();
            if (!resource.valid(data))
                throw new errors_1.ServiceError(502, 'Upstream catalog structure is invalid; previous data retained');
            if (previous && resource.valid(previous.data) && resource.replacementValid && !resource.replacementValid(previous.data, data)) {
                throw new errors_1.ServiceError(502, 'Upstream catalog is incomplete; previous data retained');
            }
            const snapshot = { data, updatedAt: startedAt };
            let latest;
            try {
                const saved = await this.repository.saveSnapshot(resource.key, snapshot, resource.cards(data));
                latest = saved ? snapshot : await this.repository.getSnapshot(resource.key);
            }
            catch {
                throw new errors_1.ServiceError(503, 'Catalog snapshot could not be saved');
            }
            if (!latest || !resource.valid(latest.data))
                throw new errors_1.ServiceError(503, 'Catalog snapshot could not be saved');
            this.remember(this.snapshots, resource.key, latest);
            this.failures.delete(resource.key);
            return latest;
        })().catch((error) => {
            this.remember(this.failures, resource.key, { until: this.now() + 30000, error });
            logger_1.logger.warn('Catalog refresh failed; retaining previous data', { key: resource.key, reason: error instanceof Error ? error.name : 'unknown' });
            throw error;
        }).finally(() => { this.pending.delete(resource.key); });
        this.pending.set(resource.key, work);
        return work;
    }
}
exports.CatalogService = CatalogService;
