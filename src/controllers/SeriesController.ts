import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { slugParameter } from '../services/validation';
import { isJsonObject } from '../types/catalog';
import { getSchedule } from '../services/ScheduleService';

export const getSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('series', slugParameter(req.params.id));
    res.json({ success: true, data, meta });
  } catch (error) {
    next(error);
  }
};

export const getSeriesSeasons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('series', slugParameter(req.params.id));
    res.json({ success: true, data: Array.isArray(data.seasons) ? data.seasons : [], meta });
  } catch (error) {
    next(error);
  }
};

export const getSeriesEpisodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('series', slugParameter(req.params.id));
    const episodes = Array.isArray(data.seasons)
      ? data.seasons.flatMap(season => isJsonObject(season) && Array.isArray(season.episodes) ? season.episodes : []) : [];
    res.json({ success: true, data: episodes, meta });
  } catch (error) {
    next(error);
  }
};

/** One episode of a series: its title and video servers (P2P/HYDRAX/…). */
export const getEpisode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('episode', slugParameter(req.params.id));
    res.json({ success: true, data, meta });
  } catch (error) {
    next(error);
  }
};

/** Estimated update weekdays and latest upload of a series, from its recent episodes. */
export const getSeriesSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSchedule(slugParameter(req.params.id));
    res.set('Cache-Control', 'public, max-age=1800').json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
