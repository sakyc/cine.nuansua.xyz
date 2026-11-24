import { NextFunction, Request, Response } from 'express';
import { isEmbeddableProvider, resolveEmbed } from '../services/EmbedService';
import { slugParameter } from '../services/validation';
import { ServiceError } from '../services/errors';

export async function embed(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, provider } = req.params;
    if (type !== 'movie' && type !== 'series' && type !== 'episode') throw new ServiceError(400, 'Invalid content type');
    const name = provider.toUpperCase();
    if (!isEmbeddableProvider(name)) throw new ServiceError(404, 'This server cannot be embedded');
    const data = await resolveEmbed(type, slugParameter(req.params.slug), name);
    res.set('Cache-Control', 'private, max-age=600').json({ success: true, data });
  } catch (error) { next(error); }
}
