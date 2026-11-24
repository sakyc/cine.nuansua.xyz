import { Prisma, PrismaClient } from '@prisma/client';
import { CatalogCard, JsonObject, isCatalogCard, isJsonObject } from '../types/catalog';

export type StoredSnapshot = { data: JsonObject; updatedAt: Date };
export type SearchResult = { results: CatalogCard[]; total: number };

export interface CatalogRepository {
  getSnapshot(key: string): Promise<StoredSnapshot | null>;
  saveSnapshot(key: string, snapshot: StoredSnapshot, cards: CatalogCard[]): Promise<boolean>;
  search(query: string, page: number, limit: number): Promise<SearchResult>;
}

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly db: PrismaClient) {}

  async getSnapshot(key: string): Promise<StoredSnapshot | null> {
    const snapshot = await this.db.catalogSnapshot.findUnique({ where: { key } });
    if (!snapshot) return null;
    if (!isJsonObject(snapshot.data)) throw new Error('Invalid stored catalog snapshot');
    return { data: snapshot.data, updatedAt: snapshot.updatedAt };
  }

  async saveSnapshot(key: string, snapshot: StoredSnapshot, cards: CatalogCard[]): Promise<boolean> {
    const uniqueCards = [...new Map(cards.map(card => [card.slug, card])).values()];
    const entries = uniqueCards.map(card => ({ slug: card.slug, title: card.title, type: card.type, card }));

    return this.db.$transaction(async tx => {
      // An older refresh must not overwrite a newer result from another worker.
      const changed = await tx.$executeRaw`
        INSERT INTO "CatalogSnapshot" ("key", "data", "updatedAt")
        VALUES (${key}, ${JSON.stringify(snapshot.data)}::jsonb, ${snapshot.updatedAt})
        ON CONFLICT ("key") DO UPDATE SET "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt"
        WHERE "CatalogSnapshot"."updatedAt" <= EXCLUDED."updatedAt"`;
      if (!changed) return false;

      if (entries.length) {
        await tx.$executeRaw`
          INSERT INTO "CatalogEntry" ("slug", "title", "type", "card", "updatedAt")
          SELECT x.slug, x.title, x.type, x.card, ${snapshot.updatedAt}
          FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb)
            AS x(slug text, title text, type text, card jsonb)
          ON CONFLICT ("slug") DO UPDATE SET
            "title" = EXCLUDED."title", "type" = EXCLUDED."type",
            "card" = EXCLUDED."card", "updatedAt" = EXCLUDED."updatedAt"
          WHERE "CatalogEntry"."updatedAt" <= EXCLUDED."updatedAt"`;
      }
      return true;
    });
  }

  async search(query: string, page: number, limit: number): Promise<SearchResult> {
    const tokens = query.match(/[\p{L}\p{N}]+/gu) || [];
    if (!tokens.length) return { results: [], total: 0 };
    const searchQuery = tokens.map(token => `${token}:*`).join(' & ');
    const condition = Prisma.sql`to_tsvector('simple', "title") @@ to_tsquery('simple', ${searchQuery})`;
    const [rows, counts] = await this.db.$transaction([
      this.db.$queryRaw<Array<{ card: unknown }>>(Prisma.sql`
        SELECT "card" FROM "CatalogEntry" WHERE ${condition}
        ORDER BY ts_rank(to_tsvector('simple', "title"), to_tsquery('simple', ${searchQuery})) DESC,
          "title", "slug"
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
      this.db.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT count(*) AS total FROM "CatalogEntry" WHERE ${condition}`),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

    const results = rows.map(({ card }) => {
      if (!isCatalogCard(card)) throw new Error('Invalid stored catalog card');
      return card;
    });
    return { results, total: Number(counts[0].total) };
  }
}
