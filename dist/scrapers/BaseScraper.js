"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseScraper = exports.PageNotFoundError = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const https_1 = __importDefault(require("https"));
const catalog_1 = require("../types/catalog");
class PageNotFoundError extends Error {
    status = 404;
    constructor(message = 'Film / Series not found') {
        super(message);
        this.name = 'PageNotFoundError';
    }
}
exports.PageNotFoundError = PageNotFoundError;
class BaseScraper {
    get baseUrl() {
        return env_1.config.lk21BaseUrl;
    }
    get baseUrls() {
        return env_1.config.lk21BaseUrls?.length ? env_1.config.lk21BaseUrls : [env_1.config.lk21BaseUrl];
    }
    buildAxiosConfig(url, baseUrl) {
        const cfg = {
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
            httpsAgent: new https_1.default.Agent({ family: 4, keepAlive: true }),
            timeout: env_1.config.upstreamTimeoutMs || 8000,
            maxRedirects: 5,
            validateStatus: (s) => s < 500,
        };
        if (env_1.config.proxyUrl) {
            try {
                const p = new URL(env_1.config.proxyUrl);
                cfg.proxy = {
                    host: p.hostname,
                    port: Number(p.port) || (p.protocol === 'https:' ? 443 : 80),
                    ...(p.username ? { auth: { username: decodeURIComponent(p.username), password: decodeURIComponent(p.password) } } : {}),
                    protocol: p.protocol.replace(':', ''),
                };
            }
            catch {
                logger_1.logger.warn('Invalid proxy URL configuration');
            }
        }
        return cfg;
    }
    async fetchHtml(endpoint) {
        const isAbsolute = endpoint.startsWith('http');
        const bases = isAbsolute ? [''] : this.baseUrls;
        const tried = [];
        for (const base of bases) {
            const url = isAbsolute ? endpoint : `${base}${endpoint}`;
            const baseLabel = isAbsolute ? new URL(endpoint).origin : base;
            const requestedPath = new URL(url).pathname;
            try {
                const response = await axios_1.default.get(url, this.buildAxiosConfig(url, baseLabel));
                if (response.status === 403 || response.status === 401 || response.status === 429 || response.status >= 500) {
                    tried.push({ base: baseLabel, status: response.status });
                    logger_1.logger.error(`Upstream ${response.status} for ${endpoint} via ${baseLabel}`);
                    continue;
                }
                if (response.status >= 400) {
                    const upstream = new Error(`Upstream LK21 error: ${response.status}`);
                    upstream.status = response.status === 404 ? 404 : 502;
                    upstream.upstreamStatus = response.status;
                    upstream.triedBases = tried;
                    throw upstream;
                }
                const finalUrl = response.request?.res?.responseUrl || '';
                if (finalUrl) {
                    const finalPath = new URL(finalUrl).pathname;
                    if (finalPath === '/' && requestedPath !== '/' && requestedPath !== '') {
                        throw new PageNotFoundError();
                    }
                }
                const $ = cheerio.load(response.data);
                const redirectBtn = $('a:contains("Buka Sekarang"), a:contains("Nontondrama")');
                if (redirectBtn.length > 0 && redirectBtn.attr('href')) {
                    const targetUrl = redirectBtn.attr('href');
                    logger_1.logger.info(`Following redirect to ${targetUrl}`);
                    const targetResponse = await axios_1.default.get(targetUrl, this.buildAxiosConfig(targetUrl, baseLabel));
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
                    if (targetFinalUrl) {
                        const finalPath = new URL(targetFinalUrl).pathname;
                        if (finalPath === '/' && requestedPath !== '/' && requestedPath !== '') {
                            throw new PageNotFoundError();
                        }
                    }
                    return cheerio.load(targetResponse.data);
                }
                return $;
            }
            catch (error) {
                if (error instanceof PageNotFoundError) {
                    throw error;
                }
                if (error?.triedBases) {
                    throw error;
                }
                if (axios_1.default.isAxiosError(error) && error?.response) {
                    const status = error.response.status;
                    if (status === 403 || status === 401 || status === 429 || status >= 500) {
                        tried.push({ base: baseLabel, status });
                        logger_1.logger.error(`Upstream ${status} for ${endpoint} via ${baseLabel}`);
                        continue;
                    }
                    const upstream = new Error(`Upstream LK21 error: ${status}`);
                    upstream.status = status === 404 ? 404 : 502;
                    upstream.upstreamStatus = status;
                    upstream.triedBases = tried;
                    logger_1.logger.error(`Upstream ${status} for ${endpoint} via ${baseLabel}`, error?.message);
                    throw upstream;
                }
                tried.push({ base: baseLabel, error: error?.message || String(error) });
                logger_1.logger.error(`Failed to fetch ${endpoint} via ${baseLabel}`, error?.message || error);
            }
        }
        const last = tried[tried.length - 1];
        const upstream = new Error(last?.status ? `Upstream LK21 error: ${last.status}` : `Upstream LK21 unreachable: ${last?.error || 'unknown'}`);
        upstream.status = 502;
        if (last?.status)
            upstream.upstreamStatus = last.status;
        upstream.triedBases = tried;
        throw upstream;
    }
    extractText($, context, selectors) {
        for (const sel of selectors) {
            const text = $(context).find(sel).first().text().trim();
            if (text)
                return text;
        }
        return '';
    }
    extractAttr($, context, selectors, attr) {
        for (const sel of selectors) {
            const el = $(context).find(sel).first();
            let val = el.attr(attr);
            if (!val && attr === 'src') {
                val = el.attr('data-src') || el.attr('data-lazy-src') || el.attr('data-original');
            }
            if (val)
                return val.trim();
        }
        return '';
    }
    async fetchExtraDetails(id) {
        try {
            return this.extractExtraDetails(await this.fetchHtml(`/${id}`));
        }
        catch {
            logger_1.logger.warn('Additional metadata unavailable', { id });
            return (0, catalog_1.emptyExtraDetails)();
        }
    }
    extractExtraDetails($) {
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
            if (text.includes('Subtitle:'))
                subtitle = text.replace('Subtitle:', '').trim();
            if (text.includes('Sutradara:'))
                sutradara = text.replace('Sutradara:', '').trim();
            if (text.includes('Bintang Film:'))
                bintangFilm = text.replace('Bintang Film:', '').trim();
            if (text.includes('Negara:'))
                negara = text.replace('Negara:', '').trim();
            if (text.includes('Release:'))
                release = text.replace('Release:', '').trim();
            if (text.includes('Updated:'))
                updated = text.replace('Updated:', '').trim();
            if (text.includes('Votes:'))
                votes = text.replace('Votes:', '').trim();
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
    extractTrailer($) {
        let rawUrl = null;
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
        if (!rawUrl)
            return null;
        const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        if (match && match[1]) {
            return `https://www.youtube-nocookie.com/embed/${match[1]}`;
        }
        return rawUrl;
    }
}
exports.BaseScraper = BaseScraper;
