import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { slugParameter } from '../services/validation';
import { isJsonObject } from '../types/catalog';

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
