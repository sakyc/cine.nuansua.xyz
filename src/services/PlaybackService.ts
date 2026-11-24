import axios from 'axios';
import { randomBytes } from 'crypto';
import { lookup } from 'dns/promises';
import { Agent, AgentOptions } from 'https';
import type { LookupAddress } from 'dns';
import { Readable, Transform } from 'stream';
import { isIP } from 'net';
import { catalog } from './catalog';
import { isJsonObject } from '../types/catalog';
import { ServiceError } from './errors';

type Session = { manifest: string; segments: string[]; expires: number };
const sessions = new Map<string, Session>();
const maxSessions = 100;
const sessionLifetime = 4 * 60 * 60_000;

export function isPublicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export function validateSource(raw: string, role: 'provider' | 'player' | 'manifest' | 'segment'): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new ServiceError(502, 'Invalid playback source'); }
  const host = url.hostname.toLowerCase();
  const permitted = role === 'provider' ? host === 'videonode.de' && (url.pathname === '/api.php' || /^\/iframe3\/p2p\/[a-zA-Z0-9_-]{1,200}\/?$/.test(url.pathname))
    : role === 'player' ? host === 'playcdn.de' && /^\/(?:verify\/)?[a-zA-Z0-9_-]{1,200}\/?$/.test(url.pathname)
      : role === 'manifest' ? host === 'stream.playcdn.de'
        : /^duck\.[a-z0-9-]{1,63}\.xyz$/.test(host);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !permitted) {
    throw new ServiceError(502, 'Unsupported playback source');
  }
  return url;
}

export function rewriteManifest(text: string, source: URL, sessionId: string): { manifest: string; segments: string[] } {
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines[0]?.trim() !== '#EXTM3U' || lines.length > 10000) throw new ServiceError(502, 'Invalid playback manifest');
  const segments: string[] = [];
  const rewritten = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (/^#EXT-X-(KEY|SESSION-KEY|MAP|STREAM-INF|MEDIA|I-FRAME-STREAM-INF|BYTERANGE|DISCONTINUITY|PART|PRELOAD-HINT)(?::|$)/i.test(trimmed) || /URI=/i.test(trimmed)) {
        throw new ServiceError(502, 'Unsupported playback manifest format');
      }
      return line;
    }
    if (segments.length >= 5000) throw new ServiceError(502, 'Playback manifest is too large');
    const segment = validateSource(new URL(trimmed, source).href, 'segment');
    segments.push(segment.href);
    return `/api/playback/${sessionId}/segment/${segments.length - 1}`;
  });
  if (!segments.length) throw new ServiceError(502, 'Playback manifest has no segments');
  return { manifest: rewritten.join('\n'), segments };
}

type Role = 'provider' | 'player' | 'manifest' | 'segment';
type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

const dnsLifetime = 60_000;
const dnsCache = new Map<string, { address: string; expires: number }>();
const maxMetadataRequests = 16;
const maxSegmentStreams = 64;
const maxSegmentBytes = 8 * 1024 * 1024;
let activeRequests = 0;
let activeSegments = 0;

async function resolvePublic(hostname: string): Promise<string> {
  const now = Date.now();
  const cached = dnsCache.get(hostname);
  if (cached && cached.expires > now) return cached.address;
  const addresses = await lookup(hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(item => !isPublicIPv4(item.address))) throw new ServiceError(502, 'Invalid playback network address');
  dnsCache.set(hostname, { address: addresses[0].address, expires: now + dnsLifetime });
  if (dnsCache.size > 200) dnsCache.delete(dnsCache.keys().next().value as string);
  return addresses[0].address;
}

// One keep-alive agent for every upstream playback request. The lookup hook validates
// each new connection, so reused sockets never point at a non-public address.
const agent = new Agent({
  family: 4, keepAlive: true, maxSockets: 64, maxFreeSockets: 16, timeout: 30_000,
  lookup: ((hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    resolvePublic(hostname).then(
      address => options?.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4),
      error => callback(error, '', 4),
    );
  }) as unknown as AgentOptions['lookup'],
});

function requestConfig(url: URL, options: { method?: 'get' | 'post'; body?: string; referer?: string }) {
  return {
    url: url.href, method: options.method || 'get', data: options.body,
    headers: { 'User-Agent': 'Mozilla/5.0', ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(options.referer ? { Referer: options.referer } : {}) },
    httpsAgent: agent, proxy: false as const, maxRedirects: 0, timeout: 15000, maxBodyLength: 4096,
  };
}

function upstreamError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  if (axios.isAxiosError(error) && error.cause instanceof ServiceError) return error.cause;
  return new ServiceError(502, 'Playback source is temporarily unavailable');
}

async function requestSource(raw: string, role: Exclude<Role, 'segment'>, options: { method?: 'get' | 'post'; body?: string; referer?: string } = {}) {
  const url = validateSource(raw, role);
  if (activeRequests >= maxMetadataRequests) throw new ServiceError(503, 'Playback is busy; retry shortly');
  activeRequests++;
  try {
    return await axios.request({ ...requestConfig(url, options), maxContentLength: 2 * 1024 * 1024, responseType: 'text' });
  } catch (error) {
    throw upstreamError(error);
  } finally { activeRequests--; }
}

/** Resolves with the first chunk while leaving the stream paused with that chunk unshifted. */
function peek(stream: Readable): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { stream.off('data', onData); stream.off('end', onEnd); stream.off('error', onError); };
    const onData = (chunk: Buffer) => { stream.pause(); cleanup(); stream.unshift(chunk); resolve(chunk); };
    const onEnd = () => { cleanup(); resolve(null); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    stream.on('data', onData); stream.once('end', onEnd); stream.once('error', onError);
  });
}

export type SegmentStream = { stream: Readable; length?: number };

function jsonObject(raw: unknown): Record<string, unknown> {
  try { const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw; if (isJsonObject(value)) return value; } catch { /* invalid upstream JSON */ }
  throw new ServiceError(502, 'Invalid playback response');
}

export async function createPlayback(type: 'movie' | 'series', slug: string) {
  const now = Date.now();
  for (const [key, value] of sessions) if (value.expires <= now) sessions.delete(key);
  if (sessions.size >= maxSessions) throw new ServiceError(503, 'Playback session limit reached');
  const { data } = await catalog.getDetail(type, slug);
  const entry = Array.isArray(data.streamembed) ? data.streamembed.find(item => isJsonObject(item) && item.provider === 'P2P') : undefined;
  if (!isJsonObject(entry) || typeof entry.url !== 'string') throw new ServiceError(404, 'P2P player is unavailable for this title');
  const provider = validateSource(entry.url, 'provider');
  if (!provider.pathname.startsWith('/iframe3/p2p/')) throw new ServiceError(502, 'Invalid playback source');
  const id = provider.pathname.split('/').filter(Boolean).pop();
  if (!id) throw new ServiceError(502, 'Invalid playback source');
  const providerResponse = await requestSource('https://videonode.de/api.php', 'provider', { method: 'post', body: new URLSearchParams({ host: 'p2p', id }).toString(), referer: provider.href });
  const embed = jsonObject(providerResponse.data).embedUrl;
  if (typeof embed !== 'string') throw new ServiceError(502, 'Playback source is unavailable');
  const player = validateSource(embed, 'player');
  const playerId = player.pathname.split('/').filter(Boolean).pop();
  if (!playerId) throw new ServiceError(502, 'Invalid playback source');
  const verifyUrl = `https://playcdn.de/verify/${playerId}`;
  const verify = await requestSource(verifyUrl, 'player', { referer: player.href });
  const info = jsonObject(verify.data);
  if (info.status !== 'success' || typeof info.fileUrl !== 'string') throw new ServiceError(502, 'Playback source is unavailable');
  const source = validateSource(info.fileUrl, 'manifest');
  const playlist = await requestSource(source.href, 'manifest');
  if (typeof playlist.data !== 'string') throw new ServiceError(502, 'Invalid playback manifest');
  const token = randomBytes(24).toString('hex');
  const rewritten = rewriteManifest(playlist.data, source, token);
  const createdAt = Date.now();
  for (const [key, value] of sessions) if (value.expires <= createdAt) sessions.delete(key);
  if (sessions.size >= maxSessions) throw new ServiceError(503, 'Playback session limit reached');
  sessions.set(token, { ...rewritten, expires: createdAt + sessionLifetime });
  return { url: `/api/playback/${token}/playlist.m3u8`, expiresAt: new Date(createdAt + sessionLifetime).toISOString() };
}

function getSession(token: string): Session {
  if (!/^[a-f0-9]{48}$/.test(token)) throw new ServiceError(404, 'Playback session not found');
  const session = sessions.get(token);
  if (!session || session.expires <= Date.now()) { sessions.delete(token); throw new ServiceError(404, 'Playback session expired'); }
  return session;
}

export function getPlaylist(token: string) { return getSession(token).manifest; }
export async function getSegment(token: string, rawIndex: string): Promise<SegmentStream> {
  const session = getSession(token);
  if (!/^(0|[1-9]\d{0,4})$/.test(rawIndex)) throw new ServiceError(404, 'Segment not found');
  const raw = session.segments[Number(rawIndex)];
  if (!raw) throw new ServiceError(404, 'Segment not found');
  const url = validateSource(raw, 'segment');
  if (activeSegments >= maxSegmentStreams) throw new ServiceError(503, 'Playback is busy; retry shortly');
  activeSegments++;
  let released = false;
  const release = () => { if (!released) { released = true; activeSegments--; } };
  let source: Readable | undefined;
  try {
    const response = await axios.request<Readable>({ ...requestConfig(url, {}), responseType: 'stream', validateStatus: status => status === 200 });
    source = response.data;
    const declared = Number(response.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxSegmentBytes) throw new ServiceError(502, 'Video segment is too large');
    const first = await peek(source);
    if (!first || first[0] !== 0x47) throw new ServiceError(502, 'Invalid video segment');
    let total = 0;
    const guard = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        total += chunk.length;
        callback(total > maxSegmentBytes ? new ServiceError(502, 'Video segment is too large') : null, chunk);
      },
      flush(callback) { callback(total < 188 ? new ServiceError(502, 'Invalid video segment') : null); },
    });
    const upstream = source;
    upstream.once('error', error => guard.destroy(error));
    guard.once('close', () => { upstream.destroy(); release(); });
    upstream.pipe(guard);
    return { stream: guard, length: Number.isFinite(declared) && declared > 0 ? declared : undefined };
  } catch (error) {
    source?.destroy();
    release();
    throw upstreamError(error);
  }
}
