import axios from 'axios';
import { config } from '../src/config/env';
import { catalog } from '../src/services/catalog';
import { downloadSubtitle, extractCandidates, searchSubtitles } from '../src/services/SubtitleService';

jest.mock('axios');
jest.mock('../src/config/env', () => ({ config: { opensubtitlesApiKey: 'test-key' } }));
jest.mock('../src/services/catalog', () => ({ catalog: { getDetail: jest.fn() } }));

const client = jest.mocked(axios);
const details = jest.mocked(catalog.getDetail);
const item = (title: string, year: number, fileId: number, language = 'id') => ({ attributes: {
  language, release: 'WebRip', feature_details: { title, year }, files: [{ file_id: fileId }],
} });

beforeEach(() => {
  client.get.mockReset(); client.post.mockReset(); details.mockReset();
  config.opensubtitlesApiKey = 'test-key';
  details.mockResolvedValue({ data: { id: 'demo', title: 'Demo (2026)', year: 2026 }, meta: { source: 'catalog', stale: false, updatedAt: '2026-01-01T00:00:00.000Z' } });
});

it('matches only title, year, supported language and single-file candidates', () => {
  const data = { data: [item('Demo', 2026, 1), item('Other', 2026, 2), item('Demo', 2025, 3), item('Demo', 2026, 4, 'fr'), item('Demo', 2026, 1)] };
  expect(extractCandidates(data, 'Demo (2026)', 2026)).toEqual([{ fileId: 1, language: 'id', release: 'WebRip' }]);
});

it('reports missing configuration before making external requests', async () => {
  config.opensubtitlesApiKey = '';
  await expect(searchSubtitles('movie', 'demo')).rejects.toMatchObject({ status: 503 });
  expect(client.get).not.toHaveBeenCalled();
});

it('does not guess subtitles for series without episode identification', async () => {
  await expect(searchSubtitles('series', 'demo')).rejects.toMatchObject({ status: 422 });
  expect(client.get).not.toHaveBeenCalled();
});

it('searches then downloads a selected matching WebVTT file', async () => {
  client.get.mockResolvedValueOnce({ data: { data: [item('Demo', 2026, 9)] } });
  const [candidate] = await searchSubtitles('movie', 'demo');
  client.post.mockResolvedValueOnce({ data: { link: 'https://www.opensubtitles.com/download/example' } });
  client.get.mockResolvedValueOnce({ status: 200, data: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello', headers: {} });
  expect(await downloadSubtitle('demo', candidate.token)).toContain('WEBVTT');
  expect(client.post).toHaveBeenCalledWith(expect.any(String), { file_id: 9, sub_format: 'webvtt' }, expect.any(Object));
  expect(client.get.mock.calls[1][1]?.headers).toBeUndefined();
});

it('rejects links to other hosts and does not forward the API key to downloads', async () => {
  client.get.mockResolvedValueOnce({ data: { data: [item('Demo', 2026, 10)] } });
  const [candidate] = await searchSubtitles('movie', 'demo');
  client.post.mockResolvedValueOnce({ data: { link: 'http://127.0.0.1/private' } });
  await expect(downloadSubtitle('demo', candidate.token)).rejects.toMatchObject({ status: 502 });
  expect(client.get).toHaveBeenCalledTimes(1);
});

it('rejects expired or cross-title selections before download', async () => {
  client.get.mockResolvedValueOnce({ data: { data: [item('Demo', 2026, 11)] } });
  const [candidate] = await searchSubtitles('movie', 'demo');
  await expect(downloadSubtitle('other', candidate.token)).rejects.toMatchObject({ status: 404 });
  expect(client.post).not.toHaveBeenCalled();
});
