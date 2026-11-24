"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.download = download;
const SubtitleService_1 = require("../services/SubtitleService");
const validation_1 = require("../services/validation");
async function search(req, res, next) {
    try {
        const data = await (0, SubtitleService_1.searchSubtitles)(req.params.type, (0, validation_1.slugParameter)(req.params.slug));
        res.set('Cache-Control', 'no-store').json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
}
async function download(req, res, next) {
    try {
        const data = await (0, SubtitleService_1.downloadSubtitle)((0, validation_1.slugParameter)(req.params.slug), req.params.token);
        res.set('Cache-Control', 'no-store').type('text/vtt').send(data);
    }
    catch (error) {
        next(error);
    }
}
