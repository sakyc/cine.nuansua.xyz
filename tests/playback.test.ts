import { isPublicIPv4, rewriteManifest, validateSource, getPlaylist, getSegment } from '../src/services/PlaybackService';

jest.mock('../src/services/catalog', () => ({ catalog: {} }));

describe('playback source validation', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', '203.0.113.1'])('rejects non-public address %s', address => {
    expect(isPublicIPv4(address)).toBe(false);
  });
  it('allows public IPv4', () => { expect(isPublicIPv4('8.8.8.8')).toBe(true); });
  it.each([
    ['http://stream.playcdn.de/list.m3u8', 'manifest'],
    ['https://stream.playcdn.de.evil.example/list.m3u8', 'manifest'],
    ['https://playcdn.de/verify/..', 'player'],
    ['https://duck.evil.xyz:8443/segment', 'segment'],
    ['https://127.0.0.1/segment', 'segment'],
    ['https://name:secret@duck.example.xyz/segment', 'segment'],
  ] as const)('rejects unsafe or unsupported URL %s', (url, role) => {
    expect(() => validateSource(url, role)).toThrow();
  });
});

describe('playback manifest', () => {
  const source = new URL('https://stream.playcdn.de/list.m3u8');
  const token = 'a'.repeat(48);
  it('rewrites only validated segments into session-scoped local URLs', () => {
    const input = '#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:6,\nhttps://duck.example.xyz/segment.pict?token=example\n#EXT-X-ENDLIST';
    const result = rewriteManifest(input, source, token);
    expect(result.manifest).toContain(`/api/playback/${token}/segment/0`);
    expect(result.manifest).not.toContain('duck.example.xyz');
    expect(result.segments).toEqual(['https://duck.example.xyz/segment.pict?token=example']);
  });
  it('rejects unsupported encryption and master playlists', () => {
    expect(() => rewriteManifest('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key"\nhttps://duck.example.xyz/1', source, token)).toThrow();
    expect(() => rewriteManifest('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nhttps://duck.example.xyz/1', source, token)).toThrow();
  });
  it('rejects empty manifests and unsafe segment hosts', () => {
    expect(() => rewriteManifest('#EXTM3U\n#EXT-X-ENDLIST', source, token)).toThrow();
    expect(() => rewriteManifest('#EXTM3U\nhttps://127.0.0.1/admin', source, token)).toThrow();
  });
  it('does not serve unknown or malformed sessions', async () => {
    expect(() => getPlaylist('bad', 'viewer')).toThrow();
    await expect(getSegment(token, '0', 'viewer')).rejects.toMatchObject({ status: 404 });
  });
});
