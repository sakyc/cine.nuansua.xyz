export type Card = {
  id: string; slug: string; title: string; type: 'movie' | 'series'; poster: string;
  rating: number | null; year: number | null; duration: string | null; genre: string | null;
  /** Series only: still airing or finished, and episodes released so far. */
  status?: 'ongoing' | 'complete'; episodes?: number | null;
};
export type BrowseSite = 'movie' | 'drama';
/** Estimated from recent episode uploads; the source publishes no broadcast schedule. */
export type Schedule = { days: string[]; lastEpisode: { title: string; number: number | null; published: string } | null; active: boolean; basedOn: number };
export type BrowseBy = 'genre' | 'country' | 'year';
export type FilterOptions = { genres: { slug: string; name: string }[]; countries: { slug: string; name: string }[]; years: number[] };
export type Detail = {
  id: string; title: string; poster?: string; backdrop?: string; description?: string;
  year?: number | null; rating?: number | null; runtime?: string | null;
  genres?: string[]; countries?: string[]; cast?: string[];
  streamembed?: { provider: string; url: string }[];
  seasons?: Season[];
};
export type Episode = { id: string; title: string; seasonNumber: number; episodeNumber: number };
export type Season = { id: string; name: string; episodes: Episode[] };
export type Meta = { source: string; stale: boolean; updatedAt: string };
type Envelope<T> = { success: boolean; data: T; meta: Meta };
export type SearchResponse = { results: Card[]; total: number; totalPages: number; page: number; meta: Meta };
export type CategoryResponse = { items: Card[]; totalPages: number; page: number; meta: Meta };
export type SubtitleOption = { token: string; language: 'id' | 'en'; release: string };
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request<T>(path: string, signal?: AbortSignal, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const response = await fetch(`${base}${path}`, { signal, method });
  if (!response.ok) throw new Error(response.status === 404 ? 'Halaman tidak ditemukan.' : 'Data belum bisa dimuat. Silakan coba lagi.');
  return response.json() as Promise<T>;
}
export const api = {
  embed: (type: string, slug: string, provider: string, signal?: AbortSignal) => request<{ success: boolean; data: { provider: string; url: string } }>(`/embed/${type}/${encodeURIComponent(slug)}/${encodeURIComponent(provider.toLowerCase())}`, signal),
  playback: (type: string, slug: string, signal?: AbortSignal) => request<Envelope<{ url: string; expiresAt: string }>>(`/playback/${type}/${encodeURIComponent(slug)}`, signal, 'POST'),
  subtitles: async (type: string, slug: string, signal?: AbortSignal) => {
    const response = await fetch(`${base}/subtitles/${type}/${encodeURIComponent(slug)}`, { signal });
    if (response.status === 503) throw new Error('Subtitle otomatis belum dikonfigurasi.');
    if (response.status === 422) throw new Error('Subtitle otomatis untuk series belum tersedia.');
    if (!response.ok) throw new Error('Subtitle otomatis sedang tidak tersedia.');
    return response.json() as Promise<{ success: boolean; data: SubtitleOption[] }>;
  },
  subtitle: async (slug: string, token: string, signal?: AbortSignal) => {
    const response = await fetch(`${base}/subtitles/movie/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`, { signal, method: 'POST' });
    if (!response.ok) throw new Error('Subtitle tidak dapat dimuat; coba pilihan lain.');
    return response.text();
  },
  episode: (slug: string, signal?: AbortSignal) => request<Envelope<{ id: string; title: string; streamembed?: { provider: string; url: string }[] }>>(`/episode/${encodeURIComponent(slug)}`, signal),
  filters: (site: BrowseSite, signal?: AbortSignal) => request<{ success: boolean; data: FilterOptions }>(`/filters/${site}`, signal),
  // Films: /home/{genre|country|years}/:slug, series: /drama/{genre|country|year}/:slug
  browse: (site: BrowseSite, by: BrowseBy, value: string, page: number, signal?: AbortSignal) => request<CategoryResponse>(
    site === 'drama' ? `/drama/${by}/${encodeURIComponent(value)}?page=${page}` : `/home/${by === 'year' ? 'years' : by}/${encodeURIComponent(value)}?page=${page}`, signal),
  config: (signal?: AbortSignal) => request<{ success: boolean; data: { playback: boolean } }>('/config', signal),
  schedule: (slug: string, signal?: AbortSignal) => request<{ success: boolean; data: Schedule }>(`/series/${encodeURIComponent(slug)}/schedule`, signal),
  drama: (path: string, page: number, signal?: AbortSignal) => request<CategoryResponse>(`/drama/${path}?page=${page}`, signal),
  section: (name: string, signal?: AbortSignal) => request<Envelope<Card[]>>(`/home/${name}`, signal),
  detail: (type: string, slug: string, signal?: AbortSignal) => request<Envelope<Detail>>(`/${type}/${encodeURIComponent(slug)}`, signal),
  search: (query: string, page: number, signal?: AbortSignal) => request<SearchResponse>(`/search?${new URLSearchParams({ q: query, page: String(page), limit: '24' })}`, signal),
  category: (slug: string, page: number, signal?: AbortSignal) => request<CategoryResponse>(`/home/genre/${encodeURIComponent(slug)}?page=${page}`, signal),
};
