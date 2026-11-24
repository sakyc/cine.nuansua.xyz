import { NextFunction, Request, Response } from 'express';
import { downloadSubtitle, searchSubtitles } from '../services/SubtitleService';
import { slugParameter } from '../services/validation';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await searchSubtitles(req.params.type, slugParameter(req.params.slug));
    res.set('Cache-Control', 'no-store').json({ success: true, data });
  } catch (error) { next(error); }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await downloadSubtitle(slugParameter(req.params.slug), req.params.token);
    res.set('Cache-Control', 'no-store').type('text/vtt').send(data);
  } catch (error) { next(error); }
}
