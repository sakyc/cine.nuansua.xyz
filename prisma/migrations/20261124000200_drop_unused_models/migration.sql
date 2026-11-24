-- The catalog lives in "CatalogEntry" and "CatalogSnapshot". These normalized tables from the
-- original schema were never written to; this migration removes them. Rollback: prisma/rollback/unused_models.sql
DROP TABLE IF EXISTS "_CountryToMovie", "_CountryToSeries", "_GenreToMovie", "_GenreToSeries",
  "_MovieCast", "_MovieDirectors", "_MovieToStudio", "_MovieToTag", "_MovieWriters", "_SeriesToStudio";
DROP TABLE IF EXISTS "Episode", "Movie", "Series", "Genre", "Country", "Person", "Studio", "Tag";
