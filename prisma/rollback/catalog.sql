-- Back up catalog data and stop catalog readers/writers before running manually.
BEGIN;
DROP TABLE "CatalogSnapshot";
DROP TABLE "CatalogEntry";
COMMIT;
