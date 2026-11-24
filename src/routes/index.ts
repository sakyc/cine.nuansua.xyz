import { Router } from 'express';
import { 
  getHome, 
  getFilmUnggulan,
  getLatestMovies, 
  getLatestSeries, 
  getSeriesUpdate,
  getTopMonth, 
  getRecommendations,
  getFamily,
  getAction,
  getDrakor,
  getHorror,
  getRomance,
  getComedy,
  getKorea,
  getThailand,
  getIndia
} from '../controllers/HomeController';
import { search } from '../controllers/SearchController';
import { getMovie, getMovieCast } from '../controllers/MovieController';
import { getSeries, getSeriesSeasons, getSeriesEpisodes, getEpisode, getSeriesSchedule } from '../controllers/SeriesController';
import { getPerson, getPopularActors } from '../controllers/PersonController';
import { getMoviesByGenre } from '../controllers/GenreController';
import { 
  getCountries, 
  getYears, 
  getSeriesMenu, 
  getPopularMenu, 
  getAllNavigation,
  getGenres
} from '../controllers/NavigationController';
import { getCategoryMovies, getRootCategoryMovies, getDramaMovies, getFilters } from '../controllers/CategoryController';
import { getTopBoxOffice, getComingSoon, getNews, getTrailers, getHealth, getDebugUpstream } from '../controllers/MiscController';
import { cache } from '../middlewares/cache';
import { config } from '../config/env';
import { runCron } from '../controllers/CronController';
import * as playback from '../controllers/PlaybackController';
import * as subtitles from '../controllers/SubtitleController';
import { embed } from '../controllers/EmbedController';

import {
  apiLimiter, playbackCreateLimiter, requireAdmin, requirePlaybackEnabled,
  segmentLimiter, subtitleLimiter, upstreamLimiter,
} from '../middlewares/security';

const router = Router();

router.use(apiLimiter);

router.get('/cron', runCron);
router.post('/playback/:type/:slug', requirePlaybackEnabled, playbackCreateLimiter, playback.create);
router.get('/playback/:token/playlist.m3u8', requirePlaybackEnabled, segmentLimiter, playback.playlist);
router.get('/playback/:token/segment/:index', requirePlaybackEnabled, segmentLimiter, playback.segment);
router.get('/playback/:token/v/:variant/playlist.m3u8', requirePlaybackEnabled, segmentLimiter, playback.variantPlaylist);
router.get('/playback/:token/v/:variant/segment/:index', requirePlaybackEnabled, segmentLimiter, playback.segment);
router.get('/embed/:type/:slug/:provider', upstreamLimiter, embed);
router.get('/subtitles/:type/:slug', subtitleLimiter, subtitles.search);
router.post('/subtitles/movie/:slug/:token', subtitleLimiter, subtitles.download);

router.get('/home', getHome);
router.get('/home/film-unggulan', getFilmUnggulan);
router.get('/home/latest-movies', getLatestMovies);
router.get('/home/latest-series', getLatestSeries);
router.get('/home/series-update', getSeriesUpdate);
router.get('/home/top-month', getTopMonth);
router.get('/home/recommendations', getRecommendations);
router.get('/home/family', getFamily);
router.get('/home/action', getAction);
router.get('/home/drakor', getDrakor);
router.get('/home/horror', getHorror);
router.get('/home/romance', getRomance);
router.get('/home/comedy', getComedy);
router.get('/home/korea', getKorea);
router.get('/home/thailand', getThailand);
router.get('/home/india', getIndia);

// Routes below can trigger an upstream LK21 fetch for an uncached slug, so they get a tighter budget.
router.get('/search', upstreamLimiter, search);

router.get('/movie/:id', upstreamLimiter, getMovie);
router.get('/movie/:id/cast', upstreamLimiter, getMovieCast);

router.get('/series/:id', upstreamLimiter, getSeries);
router.get('/series/:id/seasons', upstreamLimiter, getSeriesSeasons);
router.get('/series/:id/episodes', upstreamLimiter, getSeriesEpisodes);
router.get('/series/:id/schedule', upstreamLimiter, getSeriesSchedule);
router.get('/episode/:id', upstreamLimiter, getEpisode);

// Series-site listings (drakor = /drama/country/south-korea)
router.get('/drama/:category(country|genre|years|year|series)/:slug', upstreamLimiter, getDramaMovies);
router.get('/drama/:slug', upstreamLimiter, getDramaMovies);
router.get('/filters/:site', getFilters);

router.get('/person/:id', upstreamLimiter, cache(86400), getPerson);
router.get('/actors/popular', cache(86400), getPopularActors);

// Navigation & Menus
router.get('/home/navigation', cache(86400), getAllNavigation);
router.get('/home/genre', cache(86400), getGenres);
router.get('/home/country', cache(86400), getCountries);
router.get('/home/years', cache(86400), getYears);
router.get('/home/series', cache(86400), getSeriesMenu);
router.get('/home/populer', cache(86400), getPopularMenu);

// Category Movies
router.get('/home/:category(genre|country|years)/:slug', upstreamLimiter, getCategoryMovies);
router.get('/home/series/:slug', upstreamLimiter, getRootCategoryMovies);
router.get('/home/populer/:slug', upstreamLimiter, getRootCategoryMovies);

// Legacy backward compatibility if needed, but the above are the main ones now
router.get('/genre/:slug/movies', upstreamLimiter, cache(3600), getMoviesByGenre);

router.get('/top-box-office', cache(3600), getTopBoxOffice);
router.get('/coming-soon', cache(3600), getComingSoon);
router.get('/news', cache(3600), getNews);
router.get('/trailers', cache(3600), getTrailers);

router.get('/health', getHealth);
// Features the frontend should offer on this server.
router.get('/config', (_req, res) => { res.set('Cache-Control', 'public, max-age=300').json({ success: true, data: { playback: config.playbackEnabled } }); });
router.get('/debug/upstream', requireAdmin, getDebugUpstream);

export default router;
