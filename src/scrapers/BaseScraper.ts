import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../config/logger';
import { config } from '../config/env';
import https from 'https';
import { emptyExtraDetails } from '../types/catalog';

export class PageNotFoundError extends Error {
  status = 404;
  constructor(message = 'Film / Series not found') {
    super(message);
    this.name = 'PageNotFoundError';
  }
}

// One keep-alive agent for all page fetches so connections to the source are reused.
const sharedAgent = new https.Agent({ family: 4, keepAlive: true, maxSockets: 32, maxFreeSockets: 8, timeout: 30_000 });

/** Hosts the scraper may land on: configured mirrors plus UPSTREAM_REDIRECT_HOSTS (subdomains included). */
function allowedHosts(): string[] {
  const configured = [...(config.lk21BaseUrls || []), config.lk21BaseUrl, ...(config.dramaBaseUrls || [])]
    .map(base => { try { return new URL(base).hostname.toLowerCase(); } catch { return ''; } })
    .filter(Boolean);
  return [...new Set([...configured, ...(config.redirectHosts || [])])];
}

export function isAllowedUpstream(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    // The series site sometimes redirects to plain http when trimming a trailing slash.
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password && !url.port
      && allowedHosts().some(allowed => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export class BaseScraper {
  protected get baseUrl() {
    return config.lk21BaseUrl;
  }

  protected get baseUrls(): string[] {
    return config.lk21BaseUrls?.length ? config.lk21BaseUrls : [config.lk21BaseUrl];
  }

  private buildAxiosConfig(url: string, baseUrl: string, remainingMs = Number.MAX_SAFE_INTEGER) {
    const cfg: any = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `${baseUrl}/`,
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      httpsAgent: sharedAgent,
      timeout: Math.max(1000, Math.min(config.upstreamTimeoutMs || 8000, remainingMs)),
      maxRedirects: 5,
      validateStatus: (s: number) => s < 500,
    };
    if (config.proxyUrl) {
      try {
        const p = new URL(config.proxyUrl);
        cfg.proxy = {
          host: p.hostname,
          port: Number(p.port) || (p.protocol === 'https:' ? 443 : 80),
          ...(p.username ? { auth: { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } } : {}),
          protocol: p.protocol.replace(':', ''),
        };
      } catch {
        logger.warn('Invalid proxy URL configuration');
      }
    }
    return cfg;
  }

  protected async fetchHtml(endpoint: string): Promise<cheerio.CheerioAPI> {
    const isAbsolute = endpoint.startsWith('http');
    const bases = isAbsolute ? [''] : this.baseUrls;
    const tried: Array<{ base: string; status?: number; error?: string }> = [];
    // All mirrors together get one time budget, so a dead source cannot stall a request for minutes.
    const deadline = Date.now() + (config.upstreamTotalTimeoutMs || 15000);

    for (const base of bases) {
      const remaining = deadline - Date.now();
      if (remaining < 1000) {
        tried.push({ base: isAbsolute ? endpoint : base, error: 'time budget exhausted' });
        break;
      }
      const url = isAbsolute ? endpoint : `${base}${endpoint}`;
      const baseLabel = isAbsolute ? new URL(endpoint).origin : base;
      const requestedPath = new URL(url).pathname;
      try {
        const response = await axios.get(url, this.buildAxiosConfig(url, baseLabel, remaining));

        if (response.status === 403 || response.status === 401 || response.status === 429 || response.status >= 500) {
          tried.push({ base: baseLabel, status: response.status });
          logger.error(`Upstream ${response.status} for ${endpoint} via ${baseLabel}`);
          continue;
        }
        if (response.status >= 400) {
          const upstream: any = new Error(`Upstream LK21 error: ${response.status}`);
          upstream.status = response.status === 404 ? 404 : 502;
          upstream.upstreamStatus = response.status;
          upstream.triedBases = tried;
          throw upstream;
        }

        const finalUrl = response.request?.res?.responseUrl || '';
        if (finalUrl && !isAllowedUpstream(finalUrl)) {
          tried.push({ base: baseLabel, error: 'redirected to an unknown host' });
          logger.warn('Upstream redirected to an unknown host', { endpoint, host: new URL(finalUrl).hostname });
          continue;
        }
        if (finalUrl) {
          const finalPath = new URL(finalUrl).pathname;
          if (finalPath === '/' && requestedPath !== '/' && requestedPath !== '') {
            throw new PageNotFoundError();
          }
        }

        const $ = cheerio.load(response.data);

        const redirectBtn = $('a:contains("Buka Sekarang"), a:contains("Nontondrama")');
        if (redirectBtn.length > 0 && redirectBtn.attr('href')) {
          const targetUrl = redirectBtn.attr('href') as string;
          // Only follow the source's "open the new site" button to known LK21/series-site hosts.
          if (!isAllowedUpstream(targetUrl)) {
            tried.push({ base: baseLabel, error: 'redirect button points to an unknown host' });
            logger.warn('Ignoring redirect button to an unknown host', { endpoint });
            continue;
          }
          logger.info(`Following redirect to ${targetUrl}`);
          const targetResponse = await axios.get(targetUrl, this.buildAxiosConfig(targetUrl, baseLabel, Math.max(1000, deadline - Date.now())));

          if ([401, 403, 429].includes(targetResponse.status) || targetResponse.status >= 500) {
            tried.push({ base: baseLabel, status: targetResponse.status });
            continue;
          }
          if (targetResponse.status >= 400) {
            throw Object.assign(new Error(`Upstream error: ${targetResponse.status}`), {
              status: targetResponse.status === 404 ? 404 : 502,
              upstreamStatus: targetResponse.status, triedBases: tried,
            });
          }

          const targetFinalUrl = targetResponse.request?.res?.responseUrl || '';
          if (targetFinalUrl && !isAllowedUpstream(targetFinalUrl)) {
            tried.push({ base: baseLabel, error: 'redirected to an unknown host' });
            continue;
          }
          if (targetFinalUrl) {
            const finalPath = new URL(targetFinalUrl).pathname;
            if (finalPath === '/' && requestedPath !== '/' && requestedPath !== '') {
              throw new PageNotFoundError();
            }
          }

          return cheerio.load(targetResponse.data);
        }

        return $;
      } catch (error: any) {
        if (error instanceof PageNotFoundError) {
          throw error;
        }
        if (error?.triedBases) {
          throw error;
        }
        if (axios.isAxiosError(error) && error?.response) {
          const status = error.response.status;
          if (status === 403 || status === 401 || status === 429 || status >= 500) {
            tried.push({ base: baseLabel, status });
            logger.error(`Upstream ${status} for ${endpoint} via ${baseLabel}`);
            continue;
          }
          const upstream: any = new Error(`Upstream LK21 error: ${status}`);
          upstream.status = status === 404 ? 404 : 502;
          upstream.upstreamStatus = status;
          upstream.triedBases = tried;
          logger.error(`Upstream ${status} for ${endpoint} via ${baseLabel}`, error?.message);
          throw upstream;
        }
        tried.push({ base: baseLabel, error: error?.message || String(error) });
        logger.error(`Failed to fetch ${endpoint} via ${baseLabel}`, error?.message || error);
      }
    }

    const last = tried[tried.length - 1];
    const upstream: any = new Error(
      last?.status ? `Upstream LK21 error: ${last.status}` : `Upstream LK21 unreachable: ${last?.error || 'unknown'}`
    );
    upstream.status = 502;
    if (last?.status) upstream.upstreamStatus = last.status;
    upstream.triedBases = tried;
    throw upstream;
  }

  protected extractText($: cheerio.CheerioAPI, context: any, selectors: string[]): string {
    for (const sel of selectors) {
      const text = $(context).find(sel).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  protected extractAttr($: cheerio.CheerioAPI, context: any, selectors: string[], attr: string): string {
    for (const sel of selectors) {
      const el = $(context).find(sel).first();
      let val = el.attr(attr);
      if (!val && attr === 'src') {
        val = el.attr('data-src') || el.attr('data-lazy-src') || el.attr('data-original');
      }
      if (val) return val.trim();
    }
    return '';
  }

  public async fetchExtraDetails(id: string) {
    try {
      return this.extractExtraDetails(await this.fetchHtml(`/${id}`));
    } catch {
      logger.warn('Additional metadata unavailable', { id });
      return emptyExtraDetails();
    }
  }

  protected extractExtraDetails($: cheerio.CheerioAPI) {
      const synopsis = $('div.synopsis.collapsed').text().trim();
      let sutradara = '';
      let bintangFilm = '';
      let negara = '';
      let votes = '';
      let release = '';
      let updated = '';
      let subtitle = '';

      $('div.detail.hidden p').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Subtitle:')) subtitle = text.replace('Subtitle:', '').trim();
        if (text.includes('Sutradara:')) sutradara = text.replace('Sutradara:', '').trim();
        if (text.includes('Bintang Film:')) bintangFilm = text.replace('Bintang Film:', '').trim();
        if (text.includes('Negara:')) negara = text.replace('Negara:', '').trim();
        if (text.includes('Release:')) release = text.replace('Release:', '').trim();
        if (text.includes('Updated:')) updated = text.replace('Updated:', '').trim();
        if (text.includes('Votes:')) votes = text.replace('Votes:', '').trim();
      });

      return {
        synopsis,
        subtitle,
        sutradara,
        bintangFilm,
        negara,
        release,
        updated,
        votes
      };
  }

  protected extractTrailer($: cheerio.CheerioAPI): string | null {
    let rawUrl: string | null = null;

    $('iframe').each((_, el) => {
      const src = $(el).attr('src');
      if (src && (src.includes('youtube') || src.includes('youtu.be'))) {
        rawUrl = src;
      }
    });

    if (!rawUrl) {
      $('a, button').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('youtube.com/watch') || href.includes('youtu.be'))) {
          rawUrl = href;
        }
      });
    }

    if (!rawUrl) return null;

    const match = (rawUrl as string).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    }

    return rawUrl;
  }
}
