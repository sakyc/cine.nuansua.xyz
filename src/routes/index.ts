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
import { getSeries, getSeriesSeasons, getSeriesEpisodes } from '../controllers/SeriesController';
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
import { getCategoryMovies, getRootCategoryMovies } from '../controllers/CategoryController';
import { getTopBoxOffice, getComingSoon, getNews, getTrailers, getHealth, getDebugUpstream } from '../controllers/MiscController';
import { cache } from '../middlewares/cache';
import { runCron } from '../controllers/CronController';
import * as playback from '../controllers/PlaybackController';
import * as subtitles from '../controllers/SubtitleController';

const router = Router();

router.get('/cron', runCron);
router.post('/playback/:type/:slug', playback.create);
router.get('/playback/:token/playlist.m3u8', playback.playlist);
router.get('/playback/:token/segment/:index', playback.segment);
router.get('/subtitles/:type/:slug', subtitles.search);
router.post('/subtitles/movie/:slug/:token', subtitles.download);

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

router.get('/search', search);

router.get('/movie/:id', getMovie);
router.get('/movie/:id/cast', getMovieCast);

router.get('/series/:id', getSeries);
router.get('/series/:id/seasons', getSeriesSeasons);
router.get('/series/:id/episodes', getSeriesEpisodes);

router.get('/person/:id', cache(86400), getPerson);
router.get('/actors/popular', cache(86400), getPopularActors);

// Navigation & Menus
router.get('/home/navigation', cache(86400), getAllNavigation);
router.get('/home/genre', cache(86400), getGenres);
router.get('/home/country', cache(86400), getCountries);
router.get('/home/years', cache(86400), getYears);
router.get('/home/series', cache(86400), getSeriesMenu);
router.get('/home/populer', cache(86400), getPopularMenu);

// Category Movies
router.get('/home/:category(genre|country|years)/:slug', getCategoryMovies);
router.get('/home/series/:slug', getRootCategoryMovies);
router.get('/home/populer/:slug', getRootCategoryMovies);

// Legacy backward compatibility if needed, but the above are the main ones now
router.get('/genre/:slug/movies', cache(3600), getMoviesByGenre);

router.get('/top-box-office', cache(3600), getTopBoxOffice);
router.get('/coming-soon', cache(3600), getComingSoon);
router.get('/news', cache(3600), getNews);
router.get('/trailers', cache(3600), getTrailers);

router.get('/health', getHealth);
router.get('/debug/upstream', getDebugUpstream);

export default router;
