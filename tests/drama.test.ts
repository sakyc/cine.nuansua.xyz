import axios from 'axios';
import { DramaScraper } from '../src/scrapers/DramaScraper';

jest.mock('axios');
jest.mock('../src/config/env', () => ({ config: {
  lk21BaseUrl: 'https://movies.example', lk21BaseUrls: ['https://movies.example'],
  dramaBaseUrls: ['https://drama.example'], proxyUrl: '', upstreamTimeoutMs: 8000,
} }));
jest.mock('../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const get = jest.mocked(axios.get);
beforeEach(() => get.mockReset());

const seriesPage = `<h1>The Remarried Empress (2026)</h1>
<script type="application/ld+json">{"@type":"TVSeries","name":"Lk21 Nonton The Remarried Empress (2026) Series Sub Indo","image":"https://img.example/p.jpg","genre":"Drama, Fantasy","actor":[{"name":"Shin Min-a"}],"director":"Jo Soo-won"}</script>
<div class="synopsis collapsed">An empress is divorced.</div>
<div class="detail hidden"><p>Negara: South Korea</p></div>
<script id="season-data" type="application/json">{"2":[{"s":2,"episode_no":1,"title":"S2E1","slug":"show-season-2-episode-1-2026"}],
"1":[{"s":1,"episode_no":2,"title":"S1E2","slug":"show-season-1-episode-2-2026"},{"s":1,"episode_no":1,"title":"S1E1","slug":"show-season-1-episode-1-2026"},{"s":1,"episode_no":3,"slug":"../evil"}]}</script>`;

it('reads a series page from the series site with its seasons and episodes', async () => {
  get.mockResolvedValue({ status: 200, data: seriesPage });
  const series = await new DramaScraper().scrapeSeries('remarried-empress-2026');
  expect(get).toHaveBeenCalledWith('https://drama.example/remarried-empress-2026', expect.any(Object));
  expect(series).toMatchObject({
    title: 'The Remarried Empress', year: 2026, description: 'An empress is divorced.',
    poster: 'https://img.example/p.jpg', genres: ['Drama', 'Fantasy'], cast: ['Shin Min-a'],
    countries: ['South Korea'], totalSeasons: 2, totalEpisodes: 3,
  });
  expect(series.seasons.map(season => season.name)).toEqual(['Season 1', 'Season 2']);
  expect(series.seasons[0].episodes.map(ep => ep.id)).toEqual(['show-season-1-episode-1-2026', 'show-season-1-episode-2-2026']);
  expect(series.seasons[0].episodes[0]).toMatchObject({ title: 'Episode 1', seasonNumber: 1, episodeNumber: 1 });
});

it('returns no seasons when the episode data is missing or malformed', async () => {
  get.mockResolvedValue({ status: 200, data: '<h1>Show (2025)</h1><script id="season-data">{not json</script>' });
  const series = await new DramaScraper().scrapeSeries('show-2025');
  expect(series).toMatchObject({ title: 'Show', year: 2025, seasons: [], totalEpisodes: 0 });
});

it('reads the video servers of an episode page', async () => {
  get.mockResolvedValue({ status: 200, data: `<h1>Show - Season 1 Episode 1 (2026)</h1><ul>
    <li><a href="https://videonode.de/iframe3/p2p/AAA" data-url="https://videonode.de/iframe3/p2p/AAA" data-server="p2p">P2P</a></li>
    <li><a href="https://videonode.de/iframe3/hydrax/BBB" data-server="hydrax">HYDRAX</a></li>
    <li><a href="javascript:alert(1)" data-server="cast">CAST</a></li>
    <li><a href="https://example.com/other">Download</a></li></ul>` });
  const episode = await new DramaScraper().scrapeEpisode('show-season-1-episode-1-2026');
  expect(episode).toMatchObject({ id: 'show-season-1-episode-1-2026', type: 'episode', title: 'Show - Season 1 Episode 1 (2026)' });
  expect(episode.streamembed).toEqual([
    { provider: 'P2P', url: 'https://videonode.de/iframe3/p2p/AAA' },
    { provider: 'HYDRAX', url: 'https://videonode.de/iframe3/hydrax/BBB' },
  ]);
});

it('marks listing cards from the series site as series', async () => {
  get.mockResolvedValue({ status: 200, data: '<article><a href="/love-menu-2026"><h3 class="poster-title">Love Menu</h3></a></article>'
    + '<ul class="pagination"><li><a href="https://drama.example/country/south-korea/page/48">&raquo;</a></li></ul>' });
  const listing = await new DramaScraper().scrapeListing('country/south-korea', 1);
  expect(get).toHaveBeenCalledWith('https://drama.example/country/south-korea/', expect.any(Object));
  expect(listing).toMatchObject({ totalPages: 48, items: [expect.objectContaining({ id: 'love-menu-2026', type: 'series', title: 'Love Menu' })] });
});

it('marks series cards as ongoing or complete with their episode count', async () => {
  get.mockResolvedValue({ status: 200, data:
    '<article><a href="/a-2026"><span class="episode complete">EPS<strong>12</strong></span><h3 class="poster-title">Done Show</h3></a></article>'
    + '<article><a href="/b-2026"><span class="episode ">EPS<strong>8</strong></span><h3 class="poster-title">Airing Show</h3></a></article>'
    + '<article><a href="/c-2026"><h3 class="poster-title">No Badge</h3></a></article>' });
  const { items } = await new DramaScraper().scrapeListing('country/south-korea', 1);
  expect(items.map(item => [item.id, item.status, item.episodes])).toEqual([
    ['a-2026', 'complete', 12], ['b-2026', 'ongoing', 8], ['c-2026', undefined, undefined],
  ]);
});

it('reads genre, country and year choices from the filter form', async () => {
  get.mockResolvedValue({ status: 200, data: `<form class="form-filter">
    <select name="genre1"><option value="">- Pilih</option><option value="action">Action</option><option value="romance">Romance</option></select>
    <select name="country"><option value="">-</option><option value="south-korea">South Korea</option><option value="bad slug">X</option></select>
    <select name="tahun"><option value="0">-</option><option value="2025">2025</option><option value="2026">2026</option></select></form>` });
  const options = await new DramaScraper().scrapeFilterOptions();
  expect(get).toHaveBeenCalledWith('https://drama.example/populer/', expect.any(Object));
  expect(options).toEqual({
    genres: [{ slug: 'action', name: 'Action' }, { slug: 'romance', name: 'Romance' }],
    countries: [{ slug: 'south-korea', name: 'South Korea' }],
    years: [2026, 2025],
  });
});
