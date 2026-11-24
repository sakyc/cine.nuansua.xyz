"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.playlist = playlist;
exports.segment = segment;
const stream_1 = require("stream");
const PlaybackService_1 = require("../services/PlaybackService");
const validation_1 = require("../services/validation");
const errors_1 = require("../services/errors");
/** Viewer identity for session binding; set TRUST_PROXY behind a reverse proxy so this is the real client IP. */
const viewer = (req) => req.ip || req.socket.remoteAddress || 'unknown';
async function create(req, res, next) {
    try {
        const type = req.params.type;
        if (type !== 'movie' && type !== 'series')
            throw new errors_1.ServiceError(400, 'Invalid content type');
        const session = await (0, PlaybackService_1.createPlayback)(type, (0, validation_1.slugParameter)(req.params.slug), viewer(req));
        res.set('Cache-Control', 'no-store').json({ success: true, data: session });
    }
    catch (error) {
        next(error);
    }
}
function playlist(req, res, next) {
    try {
        res.set('Cache-Control', 'no-store').type('application/vnd.apple.mpegurl').send((0, PlaybackService_1.getPlaylist)(req.params.token, viewer(req)));
    }
    catch (error) {
        next(error);
    }
}
async function segment(req, res, next) {
    let segmentStream;
    try {
        segmentStream = await (0, PlaybackService_1.getSegment)(req.params.token, req.params.index, viewer(req));
    }
    catch (error) {
        return next(error);
    }
    const { stream, length } = segmentStream;
    if (req.destroyed) {
        stream.destroy();
        return;
    }
    res.set('Cache-Control', 'private, max-age=300').type('video/mp2t');
    if (length)
        res.set('Content-Length', String(length));
    // Bytes go to the viewer as they arrive; a disconnecting viewer cancels the upstream download.
    (0, stream_1.pipeline)(stream, res, error => {
        if (error && !res.headersSent)
            next(error);
        else if (error)
            res.destroy();
    });
}
