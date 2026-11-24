import { catalog, catalogRepository } from './catalog';
import { logger } from '../config/logger';
import { DetailType, isJsonObject } from '../types/catalog';
import { ServiceError } from './errors';
import { lookupProviderEmbed, validateSource } from './PlaybackService';
import { config } from '../config/env';

/**
 * Resolves a server listed on a title (currently HYDRAX) to its real, embeddable player URL.
 *
 * videonode.de's own iframe pages refuse to be framed by other sites, but the player they wrap
 * (abyssplayer.com for HYDRAX) is built to be embedded and offers 360p–1080p. CAST's player only
 * allows its own domains, so it is not offered.
 */
export const embeddableProviders = { HYDRAX: 'hydrax' } as const;
export type EmbeddableProvider = keyof typeof embeddableProviders;

const cacheLifetime = 30 * 60_000;
// Player ids are stable, so a stored URL is reused for a day and kept as a fallback when videonode is unreachable.
const storedLifetime = 24 * 60 * 60_000;
const cache = new Map<string, { url: string; expires: number }>();

export function isEmbeddableProvider(value: string): value is EmbeddableProvider {
  return Object.prototype.hasOwnProperty.call(embeddableProviders, value);
}

/** Only https player URLs on known hosts (or their subdomains) with a simple id path are accepted. */
export function validateEmbedUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ServiceError(502, 'Invalid player URL'); }
  const host = url.hostname.toLowerCase();
  const allowed = config.embedHosts.some(item => host === item || host.endsWith(`.${item}`));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed || !/^\/[a-zA-Z0-9_-]{1,100}\/?$/.test(url.pathname)) {
    throw new ServiceError(502, 'Unsupported player host');
  }
  url.search = '';
  url.hash = '';
  return url;
}

export async function resolveEmbed(type: DetailType, slug: string, provider: EmbeddableProvider) {
  const key = `${type}:${slug}:${provider}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return { provider, url: cached.url };

  const stored = await readStored(key);
  if (stored && now - stored.updatedAt < storedLifetime) return remember(key, stored.url, provider);

  try {
    const url = await lookup(type, slug, provider);
    void catalogRepository.saveSnapshot(`embed:${key}`, { data: { url }, updatedAt: new Date(now) }, [])
      .catch(() => logger.warn('Embed URL could not be stored', { key }));
    return remember(key, url, provider);
  } catch (error) {
    if (stored) {
      logger.warn('Using stored embed URL; provider lookup failed', { key });
      return remember(key, stored.url, provider);
    }
    throw error;
  }
}

function remember(key: string, url: string, provider: EmbeddableProvider) {
  cache.delete(key);
  cache.set(key, { url, expires: Date.now() + cacheLifetime });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return { provider, url };
}

async function readStored(key: string): Promise<{ url: string; updatedAt: number } | null> {
  try {
    const snapshot = await catalogRepository.getSnapshot(`embed:${key}`);
    const url = snapshot?.data.url;
    if (typeof url !== 'string') return null;
    return { url: validateEmbedUrl(url).href, updatedAt: snapshot!.updatedAt.getTime() };
  } catch {
    return null;
  }
}

async function lookup(type: DetailType, slug: string, provider: EmbeddableProvider): Promise<string> {
  const { data } = await catalog.getDetail(type, slug);
  const host = embeddableProviders[provider];
  const entry = Array.isArray(data.streamembed)
    ? data.streamembed.find(item => isJsonObject(item) && item.provider === provider)
    : undefined;
  if (!isJsonObject(entry) || typeof entry.url !== 'string') throw new ServiceError(404, `${provider} player is unavailable for this title`);
  const page = validateSource(entry.url, 'provider');
  if (!page.pathname.startsWith(`/iframe3/${host}/`)) throw new ServiceError(502, 'Invalid playback source');
  const id = page.pathname.split('/').filter(Boolean).pop() as string;

  return validateEmbedUrl(await lookupProviderEmbed(host, id, page.href)).href;
}
