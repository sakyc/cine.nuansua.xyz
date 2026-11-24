import axios from 'axios';
import { Readable } from 'stream';
import { createPlayback, getPlaylist, getSegment, getVariantPlaylist, isMasterPlaylist, parseMasterPlaylist } from '../src/services/PlaybackService';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { __esModule: true, default: { ...actual, request: jest.fn(), isAxiosError: actual.isAxiosError } };
});
jest.mock('../src/services/catalog', () => ({
  catalog: { getDetail: jest.fn(async () => ({ data: { streamembed: [{ provider: 'P2P', url: 'https://videonode.de/iframe3/p2p/abc123' }] } })) },
}));

const request = axios.request as unknown as jest.Mock;
const source = new URL('https://stream.playcdn.de/master.m3u8');
const master = [
  '#EXTM3U',
  '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=90000,URI="https://stream.playcdn.de/iframes.m3u8"',
  '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480,CODECS="avc1.4d401e,mp4a.40.2",X-EVIL="<script>"',
  '480/index.m3u8',
  '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080',
  'https://stream.playcdn.de/1080/index.m3u8',
].join('\n');
const media = (name: string) => `#EXTM3U\n#EXTINF:6,\nhttps://duck.example.xyz/${name}.ts\n#EXT-X-ENDLIST`;

describe('master playlist parsing', () => {
  it('detects master playlists', () => {
    expect(isMasterPlaylist(master)).toBe(true);
    expect(isMasterPlaylist(media('a'))).toBe(false);
  });

  it('keeps known attributes, resolves relative URLs, and drops I-frame lists', () => {
    const variants = parseMasterPlaylist(master, source);
    expect(variants.map(v => v.url.href)).toEqual(['https://stream.playcdn.de/480/index.m3u8', 'https://stream.playcdn.de/1080/index.m3u8']);
    expect(variants[0].info).toBe('#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480,CODECS="avc1.4d401e,mp4a.40.2"');
  });

  it('rejects alternate renditions, encryption, and foreign variant hosts', () => {
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="a.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="a"\nv.m3u8', source)).toThrow();
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="a"\nv.m3u8', source)).toThrow();
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8', source)).toThrow();
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nhttps://127.0.0.1/v.m3u8', source)).toThrow();
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1x1\nv.m3u8', source)).toThrow();
  });

  it('allows CLOSED-CAPTIONS=NONE', () => {
    expect(parseMasterPlaylist('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,CLOSED-CAPTIONS=NONE\nv.m3u8', source)).toHaveLength(1);
  });
});

describe('multi-quality playback sessions', () => {
  beforeEach(() => request.mockReset());

  async function start(variantResponses: Array<string | Error>) {
    request
      .mockResolvedValueOnce({ data: JSON.stringify({ embedUrl: 'https://playcdn.de/xyz789' }) })
      .mockResolvedValueOnce({ data: JSON.stringify({ status: 'success', fileUrl: source.href }) })
      .mockResolvedValueOnce({ data: master });
    for (const response of variantResponses) {
      if (response instanceof Error) request.mockRejectedValueOnce(response);
      else request.mockResolvedValueOnce({ data: response });
    }
    const { url } = await createPlayback('movie', 'example', 'viewer');
    return url.split('/')[3];
  }

  it('serves a local master playlist and separate segments per quality', async () => {
    const token = await start([media('low'), media('high')]);
    const playlist = getPlaylist(token, 'viewer');
    expect(playlist).toContain('RESOLUTION=1920x1080');
    expect(playlist).toContain(`/api/playback/${token}/v/1/playlist.m3u8`);
    expect(playlist).not.toContain('playcdn.de');
    expect(playlist).not.toContain('X-EVIL');
    expect(getVariantPlaylist(token, '0', 'viewer')).toContain(`/api/playback/${token}/segment/0`);
    expect(getVariantPlaylist(token, '1', 'viewer')).toContain(`/api/playback/${token}/v/1/segment/0`);

    request.mockResolvedValueOnce({ data: Readable.from([Buffer.alloc(188, 0x47)]), headers: {} });
    await getSegment(token, '0', 'viewer', '1');
    expect(request.mock.calls.at(-1)?.[0].url).toBe('https://duck.example.xyz/high.ts');
  });

  it('leaves out a quality whose playlist cannot be loaded', async () => {
    const token = await start([new Error('down'), media('high')]);
    const playlist = getPlaylist(token, 'viewer');
    expect(playlist).toContain('RESOLUTION=1920x1080');
    expect(playlist).not.toContain('854x480');
    expect(() => getVariantPlaylist(token, '1', 'viewer')).toThrow(expect.objectContaining({ status: 404 }));
  });

  it('rejects unknown quality indexes', async () => {
    const token = await start([media('low'), media('high')]);
    expect(() => getVariantPlaylist(token, '7', 'viewer')).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => getVariantPlaylist(token, '../0', 'viewer')).toThrow(expect.objectContaining({ status: 404 }));
  });
});
