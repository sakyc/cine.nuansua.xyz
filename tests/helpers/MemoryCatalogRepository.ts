import type { CatalogRepository, StoredSnapshot } from '../../src/repositories/CatalogRepository';
import type { CatalogCard } from '../../src/types/catalog';

export class MemoryCatalogRepository implements CatalogRepository {
  readonly snapshots = new Map<string, StoredSnapshot>();
  readonly entries = new Map<string, CatalogCard>();

  async getSnapshot(key: string) {
    return this.snapshots.get(key) || null;
  }

  async saveSnapshot(key: string, snapshot: StoredSnapshot, cards: CatalogCard[]) {
    if ((this.snapshots.get(key)?.updatedAt.getTime() || 0) > snapshot.updatedAt.getTime()) return false;
    this.snapshots.set(key, structuredClone(snapshot));
    for (const card of cards) this.entries.set(card.slug, structuredClone(card));
    return true;
  }

  async search(query: string, page: number, limit: number) {
    const results = [...this.entries.values()].filter(card => card.title.toLowerCase().includes(query.toLowerCase()));
    return { results: results.slice((page - 1) * limit, page * limit), total: results.length };
  }
}
