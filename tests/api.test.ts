import request from 'supertest';
import app from '../src/app';
import axios from 'axios';
import { BaseScraper } from '../src/scrapers/BaseScraper';
import { SearchScraper } from '../src/scrapers/SearchScraper';
import { HomeScraper } from '../src/scrapers/HomeScraper';
import { CategoryScraper } from '../src/scrapers/CategoryScraper';
import { MovieScraper } from '../src/scrapers/MovieScraper';
import { SeriesScraper } from '../src/scrapers/SeriesScraper';
import { CatalogService } from '../src/services/CatalogService';
import * as runtime from '../src/services/catalog';
import { MemoryCatalogRepository } from './helpers/MemoryCatalogRepository';

jest.mock('../src/services/catalog', () => ({ __esModule: true, catalog: {} }));

jest.mock('axios');
jest.mock('../src/config/env', () => ({
  config: {
    lk21BaseUrl: 'https://catalog.example',
    lk21BaseUrls: ['https://catalog.example'],
    proxyUrl: '',
    cronSecret: 'test-cron-secret',
    redirectHosts: ['mirror.example'],
    corsOrigins: [],
    rateLimitPerMinute: 1000,
    trustProxy: 0,
    nodeEnv: 'test',
    playbackEnabled: true,
    playbackSessionsPerIp: 3,
  },
}));
jest.mock('../src/config/redis', () => ({ redis: { status: 'disabled' } }));
jest.mock('../src/config/prisma', () => ({ prisma: {} }));
jest.mock('../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const get = jest.mocked(axios.get);
const catalogHtml = '<article class="item"><a href="https://catalog.example/test-movie"><h2>Test Movie</h2></a></article>';

beforeEach(() => {
  get.mockReset();
  jest.replaceProperty(runtime, 'catalog', new CatalogService(new MemoryCatalogRepository(), {
    home: () => new HomeScraper().scrapeHome(),
    category: (path, page) => new CategoryScraper().scrapeCategory(path, page),
    detail: (type, slug) => type === 'movie' ? new MovieScraper().scrapeDetail(slug) : new SeriesScraper().scrapeDetail(slug),
  }, { homeTtlMs: 1800000, detailTtlMs: 3600000, seedPages: 0 }));
});

describe('API Endpoints', () => {
  it('GET /api/home - should return 200', async () => {
    const res = await request(app).get('/api/home');
    expect(res.status).toBe(200);
  });
  
  it('GET /api/search without query - should return 400', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/home/genre/action', '/genre/action/'],
    ['/api/home/country/indonesia', '/country/indonesia/'],
    ['/api/home/years/2024', '/year/2024/'],
    ['/home/genre/action', '/genre/action/'],
    ['/api/home/populer/populer', '/populer/'],
  ])('GET %s requests the matching upstream category', async (route, upstreamPath) => {
    get.mockResolvedValue({ status: 200, data: catalogHtml });

    const res = await request(app).get(route);

    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledWith(`https://catalog.example${upstreamPath}`, expect.any(Object));
    expect(res.body.items).toEqual([expect.objectContaining({ id: 'test-movie', title: 'Test Movie' })]);
  });

  it('preserves category pagination', async () => {
    get.mockResolvedValue({ status: 200, data: catalogHtml });

    const res = await request(app).get('/api/home/genre/action?page=2');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(get).toHaveBeenCalledWith('https://catalog.example/genre/action/page/2/', expect.any(Object));
  });

  it('reads the page count from the "»" link in LK21 pagination', async () => {
    const pagination = '<ul class="pagination"><li><a href="https://catalog.example/genre/action/page/1">1</a></li>'
      + '<li class="active"><a href="https://catalog.example/genre/action/page/2">2</a></li>'
      + '<li><a href="https://catalog.example/genre/action/page/3">3</a></li>'
      + '<li><a href="https://catalog.example/genre/action/page/50">&raquo;</a></li></ul>';
    get.mockResolvedValue({ status: 200, data: catalogHtml + pagination });

    const res = await request(app).get('/api/home/genre/action?page=2');

    expect(res.status).toBe(200);
    expect(res.body.totalPages).toBe(50);
  });

  it('returns an empty list for a successfully loaded empty category', async () => {
    get.mockResolvedValue({ status: 200, data: '<main></main>' });

    const res = await request(app).get('/api/home/genre/action');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it.each([403, 429, 404])('reports upstream %s instead of returning a successful empty category', async (status) => {
    get.mockResolvedValue({ status, data: '' });

    const res = await request(app).get('/api/home/genre/action');

    expect(res.status).toBe(status === 404 ? 404 : 502);
    expect(res.body.success).toBe(false);
    expect(res.body.error.upstreamStatus).toBe(status);
  });

  it('reports a network failure instead of returning a successful empty category', async () => {
    get.mockRejectedValue(new Error('Connection timed out'));

    const res = await request(app).get('/api/home/genre/action');

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });

  it('uses the current upstream search form path and encodes the query', async () => {
    get.mockResolvedValue({
      status: 200,
      data: catalogHtml,
      request: { res: { responseUrl: 'https://catalog.example/search?s=test%20movie' } },
    });

    const results = await new SearchScraper().search('test movie');
    expect(results).toEqual([expect.objectContaining({ id: 'test-movie' })]);
    expect(get).toHaveBeenCalledWith('https://catalog.example/search?s=test%20movie', expect.any(Object));
  });

  it('does not mistake a root URL with query parameters for a missing page', async () => {
    class QueryScraper extends BaseScraper {
      load() {
        return this.fetchHtml('/?s=test');
      }
    }
    get.mockResolvedValue({
      status: 200,
      data: catalogHtml,
      request: { res: { responseUrl: 'https://catalog.example/?s=test' } },
    });

    const $ = await new QueryScraper().load();

    expect($('h2').text()).toBe('Test Movie');
  });

  it('reports unsupported dynamic search instead of claiming there are no matches', async () => {
    get.mockResolvedValue({
      status: 200,
      data: '<body data-search_url="https://search.example/"><div id="results"></div></body>',
    });

    await expect(new SearchScraper().search('batman')).rejects.toMatchObject({ status: 502 });
  });

  it('allows search results after following an upstream landing-page link', async () => {
    get.mockResolvedValueOnce({
      status: 200,
      data: '<a href="https://mirror.example/search?s=test">Buka Sekarang</a>',
    }).mockResolvedValueOnce({
      status: 200,
      data: catalogHtml,
      request: { res: { responseUrl: 'https://mirror.example/search?s=test' } },
    });

    const results = await new SearchScraper().search('test');
    expect(results).toEqual([expect.objectContaining({ id: 'test-movie' })]);
  });

  it('returns the latest movie cards without fetching each detail page', async () => {
    get.mockResolvedValueOnce({
      status: 200,
      data: `<section class="slider-wrapper" aria-label="Film Terbaru">
        <ul class="sliders"><li><a href="https://catalog.example/test-movie">
          <h2 class="poster-title">Test Movie</h2><img src="https://catalog.example/poster.jpg">
        </a></li></ul></section>`,
    });

    const res = await request(app).get('/api/home/latest-movies');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({
      id: 'test-movie', title: 'Test Movie', synopsis: '',
    })]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('still returns 404 when a missing detail page redirects to the homepage', async () => {
    get.mockResolvedValue({
      status: 200,
      data: catalogHtml,
      request: { res: { responseUrl: 'https://catalog.example/' } },
    });

    const res = await request(app).get('/api/movie/missing-movie');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns movie metadata and a player URL for testing without a frontend', async () => {
    get.mockResolvedValue({
      status: 200,
      data: `<h1>Test Movie</h1>
        <script type="application/ld+json">{"@type":"Movie","description":"A test movie","image":"https://catalog.example/poster.jpg"}</script>
        <ul><li><a href="https://player.example/embed/test">P2P</a></li></ul>`,
    });

    const res = await request(app).get('/api/movie/test-movie');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({
      id: 'test-movie',
      title: 'Test Movie',
      streamembed: [{ provider: 'P2P', url: 'https://player.example/embed/test' }],
    }));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('searches stored cards without accessing upstream search', async () => {
    get.mockResolvedValue({ status: 200, data: '<section class="slider-wrapper" aria-label="Film Terbaru"><ul class="sliders"><li><a href="/batman-2022"><h2>The Batman</h2></a></li></ul></section>' });
    await request(app).get('/api/home/latest-movies');
    get.mockRejectedValue(new Error('Upstream offline'));
    const res = await request(app).get('/api/search?q=batman&limit=1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, totalPages: 1, page: 1, limit: 1, meta: { source: 'catalog' } });
    expect(res.body.results[0].id).toBe('batman-2022');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([
    '/api/search?q=x', '/api/search?q=%20%20', '/api/search?q=test&page=-1',
    '/api/search?q=test&limit=51', '/api/search?q=test&page=1.5', '/api/search?q[]=test',
    '/api/home/genre/action?page=abc', '/api/movie/bad%2Fslug',
  ])('rejects invalid input at %s before scraping', async path => {
    expect((await request(app).get(path)).status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('requires authentication before running a catalog refresh', async () => {
    expect((await request(app).get('/api/cron')).status).toBe(401);
    expect(get).not.toHaveBeenCalled();
  });

  it('allows an authenticated catalog refresh', async () => {
    get.mockResolvedValue({ status: 200, data: '<section class="slider-wrapper" aria-label="Film Terbaru"><ul class="sliders"><li><a href="/test-movie"><h2>Test Movie</h2></a></li></ul></section>' });
    const res = await request(app).get('/api/cron').set('Authorization', 'Bearer test-cron-secret');
    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
