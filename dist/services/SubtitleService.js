"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCandidates = extractCandidates;
exports.searchSubtitles = searchSubtitles;
exports.downloadSubtitle = downloadSubtitle;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const catalog_1 = require("./catalog");
const catalog_2 = require("../types/catalog");
const errors_1 = require("./errors");
const candidates = new Map();
const api = 'https://api.opensubtitles.com/api/v1';
const lifetime = 20 * 60 * 1000;
const limit = 500;
function headers() {
    if (!env_1.config.opensubtitlesApiKey)
        throw new errors_1.ServiceError(503, 'Subtitle otomatis belum dikonfigurasi');
    return { 'Api-Key': env_1.config.opensubtitlesApiKey, 'User-Agent': 'Sinemaku v1.0', 'Accept': 'application/json' };
}
function cleanTitle(title) {
    return title.replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim();
}
function normalized(title) {
    return cleanTitle(title).toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function extractCandidates(payload, title, year) {
    if (!(0, catalog_2.isJsonObject)(payload) || !Array.isArray(payload.data))
        throw new errors_1.ServiceError(502, 'Invalid subtitle search response');
    const items = [];
    for (const item of payload.data) {
        if (!(0, catalog_2.isJsonObject)(item) || !(0, catalog_2.isJsonObject)(item.attributes))
            continue;
        const attrs = item.attributes;
        const feature = attrs.feature_details;
        if (!(0, catalog_2.isJsonObject)(feature) || typeof feature.title !== 'string' || normalized(feature.title) !== normalized(title))
            continue;
        if (year !== null && feature.year !== year)
            continue;
        if (typeof feature.feature_type === 'string' && feature.feature_type.toLowerCase() !== 'movie')
            continue;
        if (attrs.language !== 'id' && attrs.language !== 'en')
            continue;
        if (!Array.isArray(attrs.files) || attrs.files.length !== 1 || !(0, catalog_2.isJsonObject)(attrs.files[0]))
            continue;
        const file = attrs.files[0];
        if (typeof file.file_id !== 'number' || !Number.isSafeInteger(file.file_id) || file.file_id < 1)
            continue;
        const release = typeof attrs.release === 'string' ? attrs.release.slice(0, 120) : '';
        if (!items.some(existing => existing.fileId === file.file_id))
            items.push({ fileId: file.file_id, language: attrs.language, release });
        if (items.length === 20)
            break;
    }
    return items;
}
async function searchSubtitles(type, slug) {
    const auth = headers();
    if (type !== 'movie')
        throw new errors_1.ServiceError(422, 'Subtitle otomatis series belum tersedia karena episode belum teridentifikasi');
    const { data } = await catalog_1.catalog.getDetail('movie', slug);
    const title = cleanTitle(data.title);
    if (title.length < 2 || title.length > 150)
        throw new errors_1.ServiceError(422, 'Judul film tidak dapat digunakan untuk mencari subtitle');
    const titleYear = data.title.match(/\(((?:19|20)\d{2})\)\s*$/);
    const year = typeof data.year === 'number' && Number.isInteger(data.year) ? data.year : titleYear ? Number(titleYear[1]) : null;
    try {
        const response = await axios_1.default.get(`${api}/subtitles`, {
            headers: auth, timeout: 10000, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024,
            params: { languages: 'en,id', query: title.toLowerCase(), type: 'movie', ...(year === null ? {} : { year }) },
        });
        const matches = extractCandidates(response.data, title, year);
        const now = Date.now();
        for (const [key, value] of candidates)
            if (value.expires <= now)
                candidates.delete(key);
        const output = matches.slice(0, Math.max(0, limit - candidates.size)).map(item => {
            const token = (0, crypto_1.randomBytes)(16).toString('hex');
            candidates.set(token, { fileId: item.fileId, slug, expires: now + lifetime });
            return { token, language: item.language, release: item.release };
        });
        if (!output.length && matches.length)
            throw new errors_1.ServiceError(503, 'Layanan subtitle sedang sibuk');
        return output;
    }
    catch (error) {
        if (error instanceof errors_1.ServiceError)
            throw error;
        throw new errors_1.ServiceError(502, 'Pencarian subtitle tidak tersedia');
    }
}
async function downloadSubtitle(slug, token) {
    const auth = headers();
    if (!/^[a-f0-9]{32}$/.test(token))
        throw new errors_1.ServiceError(404, 'Subtitle tidak ditemukan');
    const candidate = candidates.get(token);
    if (!candidate || candidate.slug !== slug || candidate.expires <= Date.now()) {
        if (candidate && candidate.expires <= Date.now())
            candidates.delete(token);
        throw new errors_1.ServiceError(404, 'Pilihan subtitle kedaluwarsa; cari ulang');
    }
    try {
        const response = await axios_1.default.post(`${api}/download`, { file_id: candidate.fileId, sub_format: 'webvtt' }, {
            headers: { ...auth, 'Content-Type': 'application/json' }, timeout: 10000, maxRedirects: 0, maxContentLength: 1024 * 1024,
        });
        if (!(0, catalog_2.isJsonObject)(response.data) || typeof response.data.link !== 'string')
            throw new errors_1.ServiceError(502, 'Tautan subtitle tidak valid');
        let url = new URL(response.data.link);
        for (let redirect = 0; redirect <= 3; redirect++) {
            if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.opensubtitles.com', 'opensubtitles.com', 'dl.opensubtitles.com'].includes(url.hostname)) {
                throw new errors_1.ServiceError(502, 'Sumber unduhan subtitle tidak didukung');
            }
            const file = await axios_1.default.get(url.href, { timeout: 10000, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024, responseType: 'text', validateStatus: status => status >= 200 && status < 400 });
            if (file.status >= 300 && file.headers.location) {
                url = new URL(file.headers.location, url);
                continue;
            }
            if (file.status === 200 && typeof file.data === 'string' && /^\uFEFF?WEBVTT(?:[ \t\r\n]|$)/.test(file.data))
                return file.data;
            throw new errors_1.ServiceError(502, 'Format subtitle tidak valid');
        }
        throw new errors_1.ServiceError(502, 'Terlalu banyak pengalihan subtitle');
    }
    catch (error) {
        if (error instanceof errors_1.ServiceError)
            throw error;
        throw new errors_1.ServiceError(502, 'Subtitle tidak dapat diambil; periksa kuota atau coba lagi');
    }
}
