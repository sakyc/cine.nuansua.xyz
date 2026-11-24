"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyExtraDetails = exports.homeSections = void 0;
exports.isJsonObject = isJsonObject;
exports.isCatalogCard = isCatalogCard;
exports.isHomeSnapshot = isHomeSnapshot;
exports.isCategorySnapshot = isCategorySnapshot;
exports.isDetailSnapshot = isDetailSnapshot;
exports.homeSections = [
    'filmUnggulan', 'latestMovies', 'latestSeries', 'seriesUpdate', 'topMonth',
    'recommendations', 'family', 'action', 'drakor', 'horror', 'romance',
    'comedy', 'korea', 'thailand', 'india'
];
const emptyExtraDetails = () => ({
    synopsis: '', subtitle: '', sutradara: '', bintangFilm: '', negara: '',
    release: '', updated: '', votes: ''
});
exports.emptyExtraDetails = emptyExtraDetails;
function isJsonObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.values(value).every(isJsonValue);
}
function isJsonValue(value) {
    return value === null || typeof value === 'string' || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
        || (Array.isArray(value) && value.every(isJsonValue)) || isJsonObject(value);
}
function isCatalogCard(value) {
    if (!isJsonObject(value))
        return false;
    const optionalNumber = (field) => field === null || (typeof field === 'number' && Number.isFinite(field));
    return typeof value.slug === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(value.slug)
        && value.id === value.slug && typeof value.title === 'string' && value.title.trim().length > 0
        && (value.type === 'movie' || value.type === 'series') && typeof value.poster === 'string'
        && optionalNumber(value.year) && optionalNumber(value.rating)
        && (value.duration === null || typeof value.duration === 'string')
        && (value.genre === null || typeof value.genre === 'string')
        && Object.keys((0, exports.emptyExtraDetails)()).every(key => typeof value[key] === 'string');
}
function isHomeSnapshot(value) {
    return isJsonObject(value) && exports.homeSections.every(key => Array.isArray(value[key]) && value[key].every(isCatalogCard))
        && exports.homeSections.some(key => value[key].length > 0);
}
function isCategorySnapshot(value) {
    return isJsonObject(value) && Number.isInteger(value.page) && Number.isInteger(value.totalPages)
        && Array.isArray(value.items) && value.items.every(isCatalogCard);
}
function isDetailSnapshot(value) {
    return isJsonObject(value) && typeof value.id === 'string'
        && typeof value.title === 'string' && value.title.trim().length > 0;
}
