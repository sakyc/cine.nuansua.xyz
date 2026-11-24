import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { HomeSection } from '../types/catalog';

export const getHome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        filmUnggulan: "/api/home/film-unggulan",
        latestMovies: "/api/home/latest-movies",
        latestSeries: "/api/home/latest-series",
        seriesUpdate: "/api/home/series-update",
        topMonth: "/api/home/top-month",
        recommendations: "/api/home/recommendations",
        family: "/api/home/family",
        action: "/api/home/action",
        drakor: "/api/home/drakor",
        horror: "/api/home/horror",
        comedy: "/api/home/comedy",
        korea: "/api/home/korea",
        thailand: "/api/home/thailand",
        india: "/api/home/india",
        navigation: {
          genre: "/api/home/genre",
          country: "/api/home/country",
          years: "/api/home/years",
          series: "/api/home/series",
          populer: "/api/home/populer"
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSection = (section: HomeSection) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await catalog.getHome();
    res.json({ success: true, data: result.data[section], meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const getLatestMovies = getSection('latestMovies');
export const getLatestSeries = getSection('latestSeries');
export const getTopMonth = getSection('topMonth');
export const getRecommendations = getSection('recommendations');
export const getFamily = getSection('family');
export const getAction = getSection('action');
export const getDrakor = getSection('drakor');
export const getHorror = getSection('horror');
export const getRomance = getSection('romance');
export const getKorea = getSection('korea');
export const getThailand = getSection('thailand');
export const getIndia = getSection('india');
export const getFilmUnggulan = getSection('filmUnggulan');
export const getSeriesUpdate = getSection('seriesUpdate');
export const getComedy = getSection('comedy');
