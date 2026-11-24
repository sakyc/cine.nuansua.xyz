import { Readable } from 'stream';
import axios from 'axios';
import { createPlayback, getSegment } from '../src/services/PlaybackService';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { __esModule: true, default: { ...actual, request: jest.fn(), isAxiosError: actual.isAxiosError } };
});
jest.mock('../src/services/catalog', () => ({
  catalog: { getDetail: jest.fn(async () => ({ data: { streamembed: [{ provider: 'P2P', url: 'https://videonode.de/iframe3/p2p/abc123' }] } })) },
}));

const request = axios.request as unknown as jest.Mock;
const collect = async (stream: Readable) => { const parts: Buffer[] = []; for await (const chunk of stream) parts.push(chunk as Buffer); return Buffer.concat(parts); };

async function session() {
  request
    .mockResolvedValueOnce({ data: JSON.stringify({ embedUrl: 'https://playcdn.de/xyz789' }) })
    .mockResolvedValueOnce({ data: JSON.stringify({ status: 'success', fileUrl: 'https://stream.playcdn.de/list.m3u8' }) })
    .mockResolvedValueOnce({ data: '#EXTM3U\n#EXTINF:6,\nhttps://duck.example.xyz/0.ts\n#EXT-X-ENDLIST' });
  const { url } = await createPlayback('movie', 'example');
  return url.split('/')[3];
}

describe('playback segment streaming', () => {
  beforeEach(() => request.mockReset());

  it('streams a valid TS segment without buffering it first', async () => {
    const token = await session();
    const body = Buffer.alloc(376, 0x47);
    request.mockResolvedValueOnce({ data: Readable.from([body.subarray(0, 100), body.subarray(100)]), headers: { 'content-length': '376' } });
    const result = await getSegment(token, '0');
    expect(result.length).toBe(376);
    expect(request.mock.calls[3][0]).toMatchObject({ responseType: 'stream', httpsAgent: expect.anything() });
    expect((await collect(result.stream)).equals(body)).toBe(true);
  });

  it('rejects data that is not MPEG-TS before sending anything', async () => {
    const token = await session();
    const upstream = Readable.from([Buffer.from('<html>blocked</html>')]);
    request.mockResolvedValueOnce({ data: upstream, headers: {} });
    await expect(getSegment(token, '0')).rejects.toMatchObject({ status: 502 });
    expect(upstream.destroyed).toBe(true);
  });

  it('rejects segments declared larger than the limit', async () => {
    const token = await session();
    request.mockResolvedValueOnce({ data: Readable.from([Buffer.alloc(188, 0x47)]), headers: { 'content-length': String(9 * 1024 * 1024) } });
    await expect(getSegment(token, '0')).rejects.toMatchObject({ status: 502 });
  });

  it('releases the slot when the viewer cancels', async () => {
    const token = await session();
    for (let i = 0; i < 70; i++) {
      request.mockResolvedValueOnce({ data: Readable.from([Buffer.alloc(188, 0x47)]), headers: {} });
      const { stream } = await getSegment(token, '0');
      stream.destroy();
      await new Promise(resolve => setImmediate(resolve));
    }
  });
});
