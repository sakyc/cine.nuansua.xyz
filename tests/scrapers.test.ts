import axios from 'axios';
import { MovieScraper } from '../src/scrapers/MovieScraper';
import { SeriesScraper } from '../src/scrapers/SeriesScraper';
import { BaseScraper } from '../src/scrapers/BaseScraper';

jest.mock('axios');
jest.mock('../src/config/env', () => ({ config: {
  lk21BaseUrl: 'https://first.example', lk21BaseUrls: ['https://first.example', 'https://second.example'], proxyUrl: '', upstreamTimeoutMs: 8000,
} }));
jest.mock('../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const get = jest.mocked(axios.get);
beforeEach(() => get.mockReset());

it.each(['movie', 'series'])('extracts %s metadata from one HTTP request', async type => {
  get.mockResolvedValue({ status: 200, data: `<h1>Demo</h1><script type="application/ld+json">{"@type":"${type === 'movie' ? 'Movie' : 'TVSeries'}"}</script><div class="synopsis collapsed">Synopsis</div>` });
  const scraper = type === 'movie' ? new MovieScraper() : new SeriesScraper();
  const result = await scraper.scrapeDetail('demo');
  expect(result.description).toBe('Synopsis');
  expect(get).toHaveBeenCalledTimes(1);
});

it.each(['movie', 'series'])('reuses HTML when delegating from %s to the other content type', async type => {
  get.mockResolvedValue({ status: 200, data: `<h1>Demo</h1><script type="application/ld+json">{"@type":"${type === 'movie' ? 'TVSeries' : 'Movie'}"}</script>` });
  const scraper = type === 'movie' ? new MovieScraper() : new SeriesScraper();
  expect((await scraper.scrapeDetail('demo')).title).toBe('Demo');
  expect(get).toHaveBeenCalledTimes(1);
});

class TestScraper extends BaseScraper { load() { return this.fetchHtml('/'); } }

it.each([401, 403, 429, 500, 503])('tries the next configured source after HTTP %s', async status => {
  get.mockResolvedValueOnce({ status, data: '' }).mockResolvedValueOnce({ status: 200, data: '<h1>Available</h1>' });
  const $ = await new TestScraper().load();
  expect($('h1').text()).toBe('Available');
  expect(get.mock.calls.map(call => call[0])).toEqual(['https://first.example/', 'https://second.example/']);
});

it('tries the next configured source after a network timeout', async () => {
  get.mockRejectedValueOnce(new Error('Timeout')).mockResolvedValueOnce({ status: 200, data: '<h1>Available</h1>' });
  expect((await new TestScraper().load())('h1').text()).toBe('Available');
});

describe('upstream host checks', () => {
  it('follows the redirect button only to known hosts', async () => {
    get.mockResolvedValueOnce({ status: 200, data: '<a href="https://evil.example/x">Buka Sekarang</a>' });
    get.mockResolvedValueOnce({ status: 200, data: '<a href="https://evil.example/x">Buka Sekarang</a>' });
    await expect(new TestScraper().load()).rejects.toMatchObject({ status: 502 });
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls.map(call => call[0])).not.toContain('https://evil.example/x');
  });

  it('rejects a page that was redirected to an unknown host', async () => {
    get.mockResolvedValue({ status: 200, data: '<h1>x</h1>', request: { res: { responseUrl: 'https://evil.example/' } } });
    await expect(new TestScraper().load()).rejects.toMatchObject({ status: 502 });
  });

  it('accepts subdomains of configured mirrors', async () => {
    const { isAllowedUpstream } = jest.requireActual('../src/scrapers/BaseScraper');
    expect(isAllowedUpstream('https://first.example/page')).toBe(true);
    expect(isAllowedUpstream('https://cdn.first.example/page')).toBe(true);
    expect(isAllowedUpstream('https://first.example.evil.com/page')).toBe(false);
    expect(isAllowedUpstream('ftp://first.example/page')).toBe(false);
  });
});
