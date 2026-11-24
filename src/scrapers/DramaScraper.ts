import { CheerioAPI } from 'cheerio';
import { config } from '../config/env';
import { CategoryScraper } from './CategoryScraper';

/**
 * Scrapes LK21's series site (nontondrama): listings, series pages with their episode list, and
 * episode pages with their video servers. Listing cards share LK21's markup, so CategoryScraper's
 * parser is reused with this site's base URLs.
 */
export class DramaScraper extends CategoryScraper {
  protected get baseUrl() {
    return config.dramaBaseUrls[0];
  }

  protected get baseUrls(): string[] {
    return config.dramaBaseUrls;
  }

  async scrapeListing(path: string, page = 1) {
    const result = await this.scrapeCategory(path, page);
    return { ...result, items: result.items.map(item => ({ ...item, type: 'series' as const })) };
  }

  private jsonLd($: CheerioAPI, type: string): Record<string, any> {
    for (const script of $('script[type="application/ld+json"]').toArray()) {
      try {
        const json = JSON.parse($(script).text());
        if (json?.['@type'] === type) return json;
      } catch { /* ignore malformed blocks */ }
    }
    return {};
  }

  private names(value: unknown): string[] {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list.map(item => typeof item === 'string' ? item : (item as { name?: unknown })?.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .map(name => name.trim());
  }

  async scrapeSeries(slug: string) {
    const $ = await this.fetchHtml(`/${slug}`);
    const ld = this.jsonLd($, 'TVSeries');
    const extra = this.extractExtraDetails($);
    // The h1 reads "Title (2026)"; JSON-LD's name is an SEO sentence, so it is only a fallback.
    const heading = $('h1').first().text().trim();
    const headingYear = Number(heading.match(/\((\d{4})\)\s*$/)?.[1]);
    const title = heading.replace(/\s*\(\d{4}\)\s*$/, '') || (typeof ld.name === 'string' ? ld.name.trim() : slug);

    // Episodes are embedded as JSON: { "<season>": [{ s, episode_no, title, slug }] }.
    let seasonData: Record<string, Array<{ s?: number; episode_no?: number; title?: string; slug?: string }>> = {};
    try { seasonData = JSON.parse($('script#season-data').text() || '{}'); } catch { seasonData = {}; }
    const seasons = Object.entries(seasonData)
      .map(([key, list]) => ({ number: Number(key), list: Array.isArray(list) ? list : [] }))
      .filter(season => Number.isInteger(season.number) && season.number > 0)
      .sort((a, b) => a.number - b.number)
      .map(season => {
        const episodes = season.list
          .filter(ep => typeof ep.slug === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(ep.slug))
          .map(ep => ({
            id: ep.slug as string,
            title: `Episode ${ep.episode_no ?? ''}`.trim(),
            fullTitle: typeof ep.title === 'string' ? ep.title : '',
            seasonNumber: season.number,
            episodeNumber: Number(ep.episode_no) || 0,
          }))
          .sort((a, b) => a.episodeNumber - b.episodeNumber);
        return { id: `season_${season.number}`, name: `Season ${season.number}`, episodeCount: episodes.length, episodes };
      })
      .filter(season => season.episodes.length > 0);

    const genres = typeof ld.genre === 'string' ? ld.genre.split(',').map((g: string) => g.trim()).filter(Boolean) : this.names(ld.genre);
    const yearRaw = headingYear || (ld.datePublished ? new Date(ld.datePublished).getFullYear() : NaN);
    return {
      id: slug,
      slug,
      type: 'series',
      title,
      description: extra.synopsis || (typeof ld.description === 'string' ? ld.description : ''),
      poster: (typeof ld.image === 'string' && ld.image) || this.extractAttr($, 'body', ['.detail img', 'img[itemprop="image"]', '.poster img'], 'src'),
      year: Number.isFinite(yearRaw) ? yearRaw : null,
      rating: parseFloat(this.extractText($, 'body', ['span[itemprop="ratingValue"]'])) || null,
      genres,
      countries: extra.negara ? extra.negara.split(',').map(c => c.trim()).filter(Boolean) : [],
      cast: this.names(ld.actor),
      crew: this.names(ld.director).map(name => ({ name, role: 'Director' })),
      trailer: this.extractTrailer($),
      totalSeasons: seasons.length,
      totalEpisodes: seasons.reduce((sum, season) => sum + season.episodes.length, 0),
      seasons,
      streamembed: [],
    };
  }

  async scrapeEpisode(slug: string) {
    const $ = await this.fetchHtml(`/${slug}`);
    const streamembed: Array<{ provider: string; url: string }> = [];
    $('a[data-server], ul li a').each((_, el) => {
      const provider = $(el).text().trim().toUpperCase();
      const url = $(el).attr('data-url') || $(el).attr('href') || '';
      if (/^(P2P|HYDRAX|CAST|TURBOVIP)$/.test(provider) && /^https:\/\//.test(url) && !streamembed.some(s => s.provider === provider)) {
        streamembed.push({ provider, url });
      }
    });
    const title = $('h1').first().text().trim() || slug;
    // TVEpisode JSON-LD carries the upload time, e.g. "2026-11-04 00:26:48.753872" (no timezone given).
    const ld = this.jsonLd($, 'TVEpisode');
    const stamp = typeof ld.datePublished === 'string' ? ld.datePublished.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/) : null;
    return {
      id: slug, slug, type: 'episode', title, streamembed,
      published: stamp ? `${stamp[1]}T${stamp[2]}` : null,
      seasonNumber: Number(ld.seasonNumber) || null,
      episodeNumber: Number(ld.episodeNumber) || null,
    };
  }
}
