import axios from 'axios';
import { resolveEmbed, validateEmbedUrl, isEmbeddableProvider } from '../src/services/EmbedService';
import { catalog } from '../src/services/catalog';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { __esModule: true, default: { ...actual, request: jest.fn(), isAxiosError: actual.isAxiosError } };
});
const store = new Map<string, { data: Record<string, unknown>; updatedAt: Date }>();
jest.mock('../src/services/catalog', () => ({
  catalog: { getDetail: jest.fn() },
  catalogRepository: {
    getSnapshot: jest.fn(async (key: string) => store.get(key) ?? null),
    saveSnapshot: jest.fn(async (key: string, snapshot: { data: Record<string, unknown>; updatedAt: Date }) => { store.set(key, snapshot); return true; }),
  },
}));
jest.mock('../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const request = axios.request as unknown as jest.Mock;
const getDetail = catalog.getDetail as unknown as jest.Mock;
const detail = (streamembed: unknown[]) => ({ data: { id: 'x', streamembed } });

describe('embed URL validation', () => {
  it('accepts the HYDRAX player host and strips query strings', () => {
    expect(validateEmbedUrl('https://abyssplayer.com/Hrywvr0iC?ads=1').href).toBe('https://abyssplayer.com/Hrywvr0iC');
    expect(validateEmbedUrl('https://short.abysscdn.com/abc_DEF-1').hostname).toBe('short.abysscdn.com');
  });
  it.each([
    'http://abyssplayer.com/abc',
    'https://abyssplayer.com.evil.example/abc',
    'https://evil.example/abc',
    'https://abyssplayer.com/nested/path',
    'https://abyssplayer.com/',
    'https://abyssplayer.com:8443/abc',
    'javascript:alert(1)',
  ])('rejects %s', url => {
    expect(() => validateEmbedUrl(url)).toThrow();
  });
  it('only offers HYDRAX', () => {
    expect(isEmbeddableProvider('HYDRAX')).toBe(true);
    expect(isEmbeddableProvider('CAST')).toBe(false);
    expect(isEmbeddableProvider('constructor')).toBe(false);
  });
});

describe('resolveEmbed', () => {
  beforeEach(() => { request.mockReset(); getDetail.mockReset(); store.clear(); });

  it('asks api.php for the HYDRAX player and caches the answer', async () => {
    getDetail.mockResolvedValue(detail([{ provider: 'HYDRAX', url: 'https://videonode.de/iframe3/hydrax/M-gvWN' }]));
    request.mockResolvedValueOnce({ data: JSON.stringify({ embedUrl: 'https://abyssplayer.com/Hrywvr0iC' }) });
    await expect(resolveEmbed('movie', 'cached-title', 'HYDRAX')).resolves.toEqual({ provider: 'HYDRAX', url: 'https://abyssplayer.com/Hrywvr0iC' });
    expect(request.mock.calls[0][0]).toMatchObject({ url: 'https://videonode.de/api.php', method: 'post', data: 'host=hydrax&id=M-gvWN' });
    await resolveEmbed('movie', 'cached-title', 'HYDRAX');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('falls back to a stored player URL when videonode is unreachable', async () => {
    store.set('embed:movie:offline-title:HYDRAX', { data: { url: 'https://abyssplayer.com/Stored1' }, updatedAt: new Date(Date.now() - 3 * 86400_000) });
    getDetail.mockResolvedValue(detail([{ provider: 'HYDRAX', url: 'https://videonode.de/iframe3/hydrax/abc' }]));
    request.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(resolveEmbed('movie', 'offline-title', 'HYDRAX')).resolves.toEqual({ provider: 'HYDRAX', url: 'https://abyssplayer.com/Stored1' });
  });

  it('uses a recently stored URL without contacting videonode', async () => {
    store.set('embed:movie:stored-title:HYDRAX', { data: { url: 'https://abyssplayer.com/Fresh1' }, updatedAt: new Date() });
    await expect(resolveEmbed('movie', 'stored-title', 'HYDRAX')).resolves.toEqual({ provider: 'HYDRAX', url: 'https://abyssplayer.com/Fresh1' });
    expect(getDetail).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns 404 when the title has no HYDRAX server', async () => {
    getDetail.mockResolvedValue(detail([{ provider: 'P2P', url: 'https://videonode.de/iframe3/p2p/abc' }]));
    await expect(resolveEmbed('movie', 'no-hydrax', 'HYDRAX')).rejects.toMatchObject({ status: 404 });
  });

  it('rejects server pages and player hosts outside the allowlist', async () => {
    getDetail.mockResolvedValue(detail([{ provider: 'HYDRAX', url: 'https://evil.example/iframe3/hydrax/abc' }]));
    await expect(resolveEmbed('movie', 'bad-page', 'HYDRAX')).rejects.toMatchObject({ status: 502 });

    getDetail.mockResolvedValue(detail([{ provider: 'HYDRAX', url: 'https://videonode.de/iframe3/hydrax/abc' }]));
    request.mockResolvedValueOnce({ data: JSON.stringify({ embedUrl: 'https://evil.example/abc' }) });
    await expect(resolveEmbed('movie', 'bad-player', 'HYDRAX')).rejects.toMatchObject({ status: 502 });
  });
});
