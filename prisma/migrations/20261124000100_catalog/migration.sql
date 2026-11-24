CREATE TABLE "CatalogEntry" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('movie', 'series')),
    "card" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogEntry_title_not_empty" CHECK (length(trim("title")) > 0)
);

CREATE INDEX "CatalogEntry_title_search_idx"
    ON "CatalogEntry" USING GIN (to_tsvector('simple', "title"));

CREATE TABLE "CatalogSnapshot" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
