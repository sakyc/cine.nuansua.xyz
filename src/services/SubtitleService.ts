import axios from 'axios';
import { randomBytes } from 'crypto';
import { config } from '../config/env';
import { catalog } from './catalog';
import { isJsonObject } from '../types/catalog';
import { ServiceError } from './errors';

type Candidate = { fileId: number; slug: string; expires: number };
const candidates = new Map<string, Candidate>();
const api = 'https://api.opensubtitles.com/api/v1';
const lifetime = 20 * 60 * 1000;
const limit = 500;

function headers() {
  if (!config.opensubtitlesApiKey) throw new ServiceError(503, 'Subtitle otomatis belum dikonfigurasi');
  return { 'Api-Key': config.opensubtitlesApiKey, 'User-Agent': 'Sinemaku v1.0', 'Accept': 'application/json' };
}

function cleanTitle(title: string): string {
  return title.replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim();
}

function normalized(title: string): string {
  return cleanTitle(title).toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function extractCandidates(payload: unknown, title: string, year: number | null) {
  if (!isJsonObject(payload) || !Array.isArray(payload.data)) throw new ServiceError(502, 'Invalid subtitle search response');
  const items: { fileId: number; language: string; release: string }[] = [];
  for (const item of payload.data) {
    if (!isJsonObject(item) || !isJsonObject(item.attributes)) continue;
    const attrs = item.attributes;
    const feature = attrs.feature_details;
    if (!isJsonObject(feature) || typeof feature.title !== 'string' || normalized(feature.title) !== normalized(title)) continue;
    if (year !== null && feature.year !== year) continue;
    if (typeof feature.feature_type === 'string' && feature.feature_type.toLowerCase() !== 'movie') continue;
    if (attrs.language !== 'id' && attrs.language !== 'en') continue;
    if (!Array.isArray(attrs.files) || attrs.files.length !== 1 || !isJsonObject(attrs.files[0])) continue;
    const file = attrs.files[0];
    if (typeof file.file_id !== 'number' || !Number.isSafeInteger(file.file_id) || file.file_id < 1) continue;
    const release = typeof attrs.release === 'string' ? attrs.release.slice(0, 120) : '';
    if (!items.some(existing => existing.fileId === file.file_id)) items.push({ fileId: file.file_id, language: attrs.language, release });
    if (items.length === 20) break;
  }
  return items;
}

export async function searchSubtitles(type: string, slug: string) {
  const auth = headers();
  if (type !== 'movie') throw new ServiceError(422, 'Subtitle otomatis series belum tersedia karena episode belum teridentifikasi');
  const { data } = await catalog.getDetail('movie', slug);
  const title = cleanTitle(data.title);
  if (title.length < 2 || title.length > 150) throw new ServiceError(422, 'Judul film tidak dapat digunakan untuk mencari subtitle');
  const titleYear = data.title.match(/\(((?:19|20)\d{2})\)\s*$/);
  const year = typeof data.year === 'number' && Number.isInteger(data.year) ? data.year : titleYear ? Number(titleYear[1]) : null;
  try {
    const response = await axios.get(`${api}/subtitles`, {
      headers: auth, timeout: 10000, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024,
      params: { languages: 'en,id', query: title.toLowerCase(), type: 'movie', ...(year === null ? {} : { year }) },
    });
    const matches = extractCandidates(response.data, title, year);
    const now = Date.now();
    for (const [key, value] of candidates) if (value.expires <= now) candidates.delete(key);
    const output = matches.slice(0, Math.max(0, limit - candidates.size)).map(item => {
      const token = randomBytes(16).toString('hex');
      candidates.set(token, { fileId: item.fileId, slug, expires: now + lifetime });
      return { token, language: item.language, release: item.release };
    });
    if (!output.length && matches.length) throw new ServiceError(503, 'Layanan subtitle sedang sibuk');
    return output;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(502, 'Pencarian subtitle tidak tersedia');
  }
}

export async function downloadSubtitle(slug: string, token: string): Promise<string> {
  const auth = headers();
  if (!/^[a-f0-9]{32}$/.test(token)) throw new ServiceError(404, 'Subtitle tidak ditemukan');
  const candidate = candidates.get(token);
  if (!candidate || candidate.slug !== slug || candidate.expires <= Date.now()) {
    if (candidate && candidate.expires <= Date.now()) candidates.delete(token);
    throw new ServiceError(404, 'Pilihan subtitle kedaluwarsa; cari ulang');
  }
  try {
    const response = await axios.post(`${api}/download`, { file_id: candidate.fileId, sub_format: 'webvtt' }, {
      headers: { ...auth, 'Content-Type': 'application/json' }, timeout: 10000, maxRedirects: 0, maxContentLength: 1024 * 1024,
    });
    if (!isJsonObject(response.data) || typeof response.data.link !== 'string') throw new ServiceError(502, 'Tautan subtitle tidak valid');
    let url = new URL(response.data.link);
    for (let redirect = 0; redirect <= 3; redirect++) {
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !['www.opensubtitles.com', 'opensubtitles.com', 'dl.opensubtitles.com'].includes(url.hostname)) {
        throw new ServiceError(502, 'Sumber unduhan subtitle tidak didukung');
      }
      const file = await axios.get(url.href, { timeout: 10000, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024, responseType: 'text', validateStatus: status => status >= 200 && status < 400 });
      if (file.status >= 300 && file.headers.location) { url = new URL(file.headers.location, url); continue; }
      if (file.status === 200 && typeof file.data === 'string' && /^\uFEFF?WEBVTT(?:[ \t\r\n]|$)/.test(file.data)) return file.data;
      throw new ServiceError(502, 'Format subtitle tidak valid');
    }
    throw new ServiceError(502, 'Terlalu banyak pengalihan subtitle');
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(502, 'Subtitle tidak dapat diambil; periksa kuota atau coba lagi');
  }
}
