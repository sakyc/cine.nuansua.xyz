import { Request, Response, NextFunction } from 'express';
import { catalog } from '../services/catalog';
import { slugParameter } from '../services/validation';

export const getMovie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('movie', slugParameter(req.params.id));
    res.json({ success: true, data, meta });
  } catch (error) {
    next(error);
  }
};

export const getMovieCast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, meta } = await catalog.getDetail('movie', slugParameter(req.params.id));
    res.json({ success: true, data: Array.isArray(data.cast) ? data.cast : [], meta });
  } catch (error) {
    next(error);
  }
};
