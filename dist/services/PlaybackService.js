"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPublicIPv4 = isPublicIPv4;
exports.validateSource = validateSource;
exports.rewriteManifest = rewriteManifest;
exports.createPlayback = createPlayback;
exports.getPlaylist = getPlaylist;
exports.getSegment = getSegment;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const promises_1 = require("dns/promises");
const https_1 = require("https");
const stream_1 = require("stream");
const net_1 = require("net");
const catalog_1 = require("./catalog");
const catalog_2 = require("../types/catalog");
const errors_1 = require("./errors");
const sessions = new Map();
const maxSessions = 100;
const sessionLifetime = 4 * 60 * 60_000;
function isPublicIPv4(address) {
    if ((0, net_1.isIP)(address) !== 4)
        return false;
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113));
}
function validateSource(raw, role) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        throw new errors_1.ServiceError(502, 'Invalid playback source');
    }
    const host = url.hostname.toLowerCase();
    const permitted = role === 'provider' ? host === 'videonode.de' && (url.pathname === '/api.php' || /^\/iframe3\/p2p\/[a-zA-Z0-9_-]{1,200}\/?$/.test(url.pathname))
        : role === 'player' ? host === 'playcdn.de' && /^\/(?:verify\/)?[a-zA-Z0-9_-]{1,200}\/?$/.test(url.pathname)
            : role === 'manifest' ? host === 'stream.playcdn.de'
                : /^duck\.[a-z0-9-]{1,63}\.xyz$/.test(host);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !permitted) {
        throw new errors_1.ServiceError(502, 'Unsupported playback source');
    }
    return url;
}
function rewriteManifest(text, source, sessionId) {
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines[0]?.trim() !== '#EXTM3U' || lines.length > 10000)
        throw new errors_1.ServiceError(502, 'Invalid playback manifest');
    const segments = [];
    const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            if (/^#EXT-X-(KEY|SESSION-KEY|MAP|STREAM-INF|MEDIA|I-FRAME-STREAM-INF|BYTERANGE|DISCONTINUITY|PART|PRELOAD-HINT)(?::|$)/i.test(trimmed) || /URI=/i.test(trimmed)) {
                throw new errors_1.ServiceError(502, 'Unsupported playback manifest format');
            }
            return line;
        }
        if (segments.length >= 5000)
            throw new errors_1.ServiceError(502, 'Playback manifest is too large');
        const segment = validateSource(new URL(trimmed, source).href, 'segment');
        segments.push(segment.href);
        return `/api/playback/${sessionId}/segment/${segments.length - 1}`;
    });
    if (!segments.length)
        throw new errors_1.ServiceError(502, 'Playback manifest has no segments');
    return { manifest: rewritten.join('\n'), segments };
}
const dnsLifetime = 60_000;
const dnsCache = new Map();
const maxMetadataRequests = 16;
const maxSegmentStreams = 64;
const maxSegmentBytes = 8 * 1024 * 1024;
let activeRequests = 0;
let activeSegments = 0;
async function resolvePublic(hostname) {
    const now = Date.now();
    const cached = dnsCache.get(hostname);
    if (cached && cached.expires > now)
        return cached.address;
    const addresses = await (0, promises_1.lookup)(hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(item => !isPublicIPv4(item.address)))
        throw new errors_1.ServiceError(502, 'Invalid playback network address');
    dnsCache.set(hostname, { address: addresses[0].address, expires: now + dnsLifetime });
    if (dnsCache.size > 200)
        dnsCache.delete(dnsCache.keys().next().value);
    return addresses[0].address;
}
// One keep-alive agent for every upstream playback request. The lookup hook validates
// each new connection, so reused sockets never point at a non-public address.
const agent = new https_1.Agent({
    family: 4, keepAlive: true, maxSockets: 64, maxFreeSockets: 16, timeout: 30_000,
    lookup: ((hostname, options, callback) => {
        resolvePublic(hostname).then(address => options?.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4), error => callback(error, '', 4));
    }),
});
function requestConfig(url, options) {
    return {
        url: url.href, method: options.method || 'get', data: options.body,
        headers: { 'User-Agent': 'Mozilla/5.0', ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(options.referer ? { Referer: options.referer } : {}) },
        httpsAgent: agent, proxy: false, maxRedirects: 0, timeout: 15000, maxBodyLength: 4096,
    };
}
function upstreamError(error) {
    if (error instanceof errors_1.ServiceError)
        return error;
    if (axios_1.default.isAxiosError(error) && error.cause instanceof errors_1.ServiceError)
        return error.cause;
    return new errors_1.ServiceError(502, 'Playback source is temporarily unavailable');
}
async function requestSource(raw, role, options = {}) {
    const url = validateSource(raw, role);
    if (activeRequests >= maxMetadataRequests)
        throw new errors_1.ServiceError(503, 'Playback is busy; retry shortly');
    activeRequests++;
    try {
        return await axios_1.default.request({ ...requestConfig(url, options), maxContentLength: 2 * 1024 * 1024, responseType: 'text' });
    }
    catch (error) {
        throw upstreamError(error);
    }
    finally {
        activeRequests--;
    }
}
/** Resolves with the first chunk while leaving the stream paused with that chunk unshifted. */
function peek(stream) {
    return new Promise((resolve, reject) => {
        const cleanup = () => { stream.off('data', onData); stream.off('end', onEnd); stream.off('error', onError); };
        const onData = (chunk) => { stream.pause(); cleanup(); stream.unshift(chunk); resolve(chunk); };
        const onEnd = () => { cleanup(); resolve(null); };
        const onError = (error) => { cleanup(); reject(error); };
        stream.on('data', onData);
        stream.once('end', onEnd);
        stream.once('error', onError);
    });
}
function jsonObject(raw) {
    try {
        const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if ((0, catalog_2.isJsonObject)(value))
            return value;
    }
    catch { /* invalid upstream JSON */ }
    throw new errors_1.ServiceError(502, 'Invalid playback response');
}
async function createPlayback(type, slug) {
    const now = Date.now();
    for (const [key, value] of sessions)
        if (value.expires <= now)
            sessions.delete(key);
    if (sessions.size >= maxSessions)
        throw new errors_1.ServiceError(503, 'Playback session limit reached');
    const { data } = await catalog_1.catalog.getDetail(type, slug);
    const entry = Array.isArray(data.streamembed) ? data.streamembed.find(item => (0, catalog_2.isJsonObject)(item) && item.provider === 'P2P') : undefined;
    if (!(0, catalog_2.isJsonObject)(entry) || typeof entry.url !== 'string')
        throw new errors_1.ServiceError(404, 'P2P player is unavailable for this title');
    const provider = validateSource(entry.url, 'provider');
    if (!provider.pathname.startsWith('/iframe3/p2p/'))
        throw new errors_1.ServiceError(502, 'Invalid playback source');
    const id = provider.pathname.split('/').filter(Boolean).pop();
    if (!id)
        throw new errors_1.ServiceError(502, 'Invalid playback source');
    const providerResponse = await requestSource('https://videonode.de/api.php', 'provider', { method: 'post', body: new URLSearchParams({ host: 'p2p', id }).toString(), referer: provider.href });
    const embed = jsonObject(providerResponse.data).embedUrl;
    if (typeof embed !== 'string')
        throw new errors_1.ServiceError(502, 'Playback source is unavailable');
    const player = validateSource(embed, 'player');
    const playerId = player.pathname.split('/').filter(Boolean).pop();
    if (!playerId)
        throw new errors_1.ServiceError(502, 'Invalid playback source');
    const verifyUrl = `https://playcdn.de/verify/${playerId}`;
    const verify = await requestSource(verifyUrl, 'player', { referer: player.href });
    const info = jsonObject(verify.data);
    if (info.status !== 'success' || typeof info.fileUrl !== 'string')
        throw new errors_1.ServiceError(502, 'Playback source is unavailable');
    const source = validateSource(info.fileUrl, 'manifest');
    const playlist = await requestSource(source.href, 'manifest');
    if (typeof playlist.data !== 'string')
        throw new errors_1.ServiceError(502, 'Invalid playback manifest');
    const token = (0, crypto_1.randomBytes)(24).toString('hex');
    const rewritten = rewriteManifest(playlist.data, source, token);
    const createdAt = Date.now();
    for (const [key, value] of sessions)
        if (value.expires <= createdAt)
            sessions.delete(key);
    if (sessions.size >= maxSessions)
        throw new errors_1.ServiceError(503, 'Playback session limit reached');
    sessions.set(token, { ...rewritten, expires: createdAt + sessionLifetime });
    return { url: `/api/playback/${token}/playlist.m3u8`, expiresAt: new Date(createdAt + sessionLifetime).toISOString() };
}
function getSession(token) {
    if (!/^[a-f0-9]{48}$/.test(token))
        throw new errors_1.ServiceError(404, 'Playback session not found');
    const session = sessions.get(token);
    if (!session || session.expires <= Date.now()) {
        sessions.delete(token);
        throw new errors_1.ServiceError(404, 'Playback session expired');
    }
    return session;
}
function getPlaylist(token) { return getSession(token).manifest; }
async function getSegment(token, rawIndex) {
    const session = getSession(token);
    if (!/^(0|[1-9]\d{0,4})$/.test(rawIndex))
        throw new errors_1.ServiceError(404, 'Segment not found');
    const raw = session.segments[Number(rawIndex)];
    if (!raw)
        throw new errors_1.ServiceError(404, 'Segment not found');
    const url = validateSource(raw, 'segment');
    if (activeSegments >= maxSegmentStreams)
        throw new errors_1.ServiceError(503, 'Playback is busy; retry shortly');
    activeSegments++;
    let released = false;
    const release = () => { if (!released) {
        released = true;
        activeSegments--;
    } };
    let source;
    try {
        const response = await axios_1.default.request({ ...requestConfig(url, {}), responseType: 'stream', validateStatus: status => status === 200 });
        source = response.data;
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > maxSegmentBytes)
            throw new errors_1.ServiceError(502, 'Video segment is too large');
        const first = await peek(source);
        if (!first || first[0] !== 0x47)
            throw new errors_1.ServiceError(502, 'Invalid video segment');
        let total = 0;
        const guard = new stream_1.Transform({
            transform(chunk, _encoding, callback) {
                total += chunk.length;
                callback(total > maxSegmentBytes ? new errors_1.ServiceError(502, 'Video segment is too large') : null, chunk);
            },
            flush(callback) { callback(total < 188 ? new errors_1.ServiceError(502, 'Invalid video segment') : null); },
        });
        const upstream = source;
        upstream.once('error', error => guard.destroy(error));
        guard.once('close', () => { upstream.destroy(); release(); });
        upstream.pipe(guard);
        return { stream: guard, length: Number.isFinite(declared) && declared > 0 ? declared : undefined };
    }
    catch (error) {
        source?.destroy();
        release();
        throw upstreamError(error);
    }
}
