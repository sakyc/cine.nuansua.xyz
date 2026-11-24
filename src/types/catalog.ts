export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export const homeSections = [
  'filmUnggulan', 'latestMovies', 'latestSeries', 'seriesUpdate', 'topMonth',
  'recommendations', 'family', 'action', 'drakor', 'horror', 'romance',
  'comedy', 'korea', 'thailand', 'india'
] as const;

export type HomeSection = typeof homeSections[number];
export type ContentType = 'movie' | 'series';

export const emptyExtraDetails = () => ({
  synopsis: '', subtitle: '', sutradara: '', bintangFilm: '', negara: '',
  release: '', updated: '', votes: ''
});

export type CatalogCard = ReturnType<typeof emptyExtraDetails> & {
  id: string;
  slug: string;
  type: ContentType;
  title: string;
  year: number | null;
  poster: string;
  rating: number | null;
  duration: string | null;
  genre: string | null;
};
export type HomeSnapshot = Record<HomeSection, CatalogCard[]>;
export type CategorySnapshot = { page: number; totalPages: number; items: CatalogCard[] };
export type DetailSnapshot = JsonObject & { id: string; title: string };

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  return value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
    || (Array.isArray(value) && value.every(isJsonValue)) || isJsonObject(value);
}

export function isCatalogCard(value: unknown): value is CatalogCard {
  if (!isJsonObject(value)) return false;
  const optionalNumber = (field: JsonValue) => field === null || (typeof field === 'number' && Number.isFinite(field));
  return typeof value.slug === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(value.slug)
    && value.id === value.slug && typeof value.title === 'string' && value.title.trim().length > 0
    && (value.type === 'movie' || value.type === 'series') && typeof value.poster === 'string'
    && optionalNumber(value.year) && optionalNumber(value.rating)
    && (value.duration === null || typeof value.duration === 'string')
    && (value.genre === null || typeof value.genre === 'string')
    && Object.keys(emptyExtraDetails()).every(key => typeof value[key] === 'string');
}

export function isHomeSnapshot(value: unknown): value is HomeSnapshot {
  return isJsonObject(value) && homeSections.every(key => Array.isArray(value[key]) && value[key].every(isCatalogCard))
    && homeSections.some(key => (value[key] as JsonValue[]).length > 0);
}

export function isCategorySnapshot(value: unknown): value is CategorySnapshot {
  return isJsonObject(value) && Number.isInteger(value.page) && Number.isInteger(value.totalPages)
    && Array.isArray(value.items) && value.items.every(isCatalogCard);
}

export function isDetailSnapshot(value: unknown): value is DetailSnapshot {
  return isJsonObject(value) && typeof value.id === 'string'
    && typeof value.title === 'string' && value.title.trim().length > 0;
}
