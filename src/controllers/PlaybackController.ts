import { NextFunction, Request, Response } from 'express';
import { pipeline } from 'stream';
import { createPlayback, getPlaylist, getSegment, SegmentStream } from '../services/PlaybackService';
import { slugParameter } from '../services/validation';
import { ServiceError } from '../services/errors';

/** Viewer identity for session binding; set TRUST_PROXY behind a reverse proxy so this is the real client IP. */
const viewer = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type;
    if (type !== 'movie' && type !== 'series') throw new ServiceError(400, 'Invalid content type');
    const session = await createPlayback(type, slugParameter(req.params.slug), viewer(req));
    res.set('Cache-Control', 'no-store').json({ success: true, data: session });
  } catch (error) { next(error); }
}

export function playlist(req: Request, res: Response, next: NextFunction) {
  try { res.set('Cache-Control', 'no-store').type('application/vnd.apple.mpegurl').send(getPlaylist(req.params.token, viewer(req))); }
  catch (error) { next(error); }
}

export async function segment(req: Request, res: Response, next: NextFunction) {
  let segmentStream: SegmentStream;
  try {
    segmentStream = await getSegment(req.params.token, req.params.index, viewer(req));
  } catch (error) { return next(error); }
  const { stream, length } = segmentStream;
  if (req.destroyed) { stream.destroy(); return; }
  res.set('Cache-Control', 'private, max-age=300').type('video/mp2t');
  if (length) res.set('Content-Length', String(length));
  // Bytes go to the viewer as they arrive; a disconnecting viewer cancels the upstream download.
  pipeline(stream, res, error => {
    if (error && !res.headersSent) next(error);
    else if (error) res.destroy();
  });
}
