// Run from the repository root: node scripts/refresh-indonesian-films.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const axios = require('axios');

const channels = new Map([
  ['UCTi-irCm6xVzft7gh9ltRNQ', 'Rapi Films'],
  ['UC3e0KfJEE6s46nn6_N-DMaQ', 'MD Entertainment'],
]);
const queries = [
  'Rapi Films full movie drama romantis', 'Rapi Films full movie Dear Nathan Hello Salma',
  'Rapi Films full movie komedi', 'Rapi Films full movie horor Suzzanna',
  'Rapi Films full movie action Barry Prima', 'Rapi Films full movie terbaru',
  'Rapi Films full movie keluarga religi', 'Rapi Films full movie klasik',
  'MD Entertainment full movie',
];
const excluded = /\b(?:trailer|teaser|behind the scene|FTV|episode|cuplikan|press conference|kompilasi)\b/i;

function readJsonAssignment(html, name) {
  const start = html.indexOf(`var ${name} = `);
  if (start < 0) throw new Error(`Missing ${name}`);
  const text = html.slice(start + name.length + 7);
  let depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') {
      if (--depth === 0) return JSON.parse(text.slice(0, i + 1));
    }
  }
  throw new Error(`Incomplete ${name}`);
}

function cleanTitle(raw) {
  let title = raw.normalize('NFKC').replace(/[^\x20-\x7E\u2013\u2014]/g, '').trim();
  title = title.replace(/^(?:Nobar|Spesial)\s+(?:Ramadhan|LEBARAN)\s*[-\u2013\u2014]+\s*/i, '');
  title = title.split(/\s*\((?:19|20)\d{2}\)\s*|\s+[-\u2013\u2014|]\s+/)[0].replace(/^"|"$/g, '').trim();
  return title === title.toUpperCase() ? title.toLowerCase().replace(/\b[a-z]/g, char => char.toUpperCase()) : title;
}

function candidateVideos(data) {
  const candidates = [];
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    const video = value.videoRenderer;
    if (video) {
      const channel = video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
      const title = video.title?.runs?.map(run => run.text).join('') || '';
      const duration = (video.lengthText?.simpleText || '').split(/[:.]/).reduce((sum, part) => sum * 60 + Number(part), 0);
      if (channels.has(channel) && /^[\w-]{11}$/.test(video.videoId) && duration >= 3600 && !excluded.test(title)) {
        candidates.push({ id: video.videoId, title: cleanTitle(title) });
      }
    }
    for (const child of Object.values(value)) walk(child);
  }
  walk(data);
  return candidates;
}

function verifiedFilm(player, candidate, checkedAt) {
  const details = player.videoDetails;
  const status = player.playabilityStatus;
  if (status?.status !== 'OK' || status.playableInEmbed !== true || !channels.has(details?.channelId)
    || details.videoId !== candidate.id || Number(details.lengthSeconds) < 3600 || excluded.test(details.title)) return null;
  const synopsis = (details.shortDescription || '').split(/\n\s*\n/)
    .find(paragraph => paragraph.length >= 120 && !/https?:|subscribe|follow|copyright|\bfull movie\b|#|nonton.*gratis/i.test(paragraph)) || '';
  const year = details.title.match(/\b(?:19|20)\d{2}\b/);
  return { id: candidate.id, title: candidate.title, source: channels.get(details.channelId), channelId: details.channelId,
    durationSeconds: Number(details.lengthSeconds), verifiedAt: checkedAt,
    year: year ? Number(year[0]) : null, synopsis: synopsis.slice(0,1800),
    views: Number(details.viewCount) || 0 };
}

async function fetchPage(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return (await axios.get(url, { timeout: 15000, maxContentLength: 10 * 1024 * 1024 })).data; }
    catch (error) { if (attempt === 1) throw error; }
  }
}

async function main() {
  const target = path.resolve(__dirname, '../frontend/src/data/indonesianFilms.ts');
  const source = await fs.readFile(target, 'utf8');
  const marker = 'export const indonesianFilms: readonly IndonesianFilm[] = ';
  const start = source.indexOf(marker) + marker.length;
  if (start < marker.length) throw new Error('Catalog marker missing');
  const existing = JSON.parse(source.slice(start).trim().replace(/;$/, ''));
  const candidates = new Map(existing.map(film => [film.id, film]));
  for (const query of queries) {
    try {
      const data = readJsonAssignment(await fetchPage(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`), 'ytInitialData');
      for (const film of candidateVideos(data)) if (!candidates.has(film.id)) candidates.set(film.id, film);
      console.log(`Search: ${query}; ${candidates.size} candidates`);
    } catch (error) { console.warn(`Search failed: ${query}: ${error.code || error.message}`); }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  const verified = new Map();
  let confirmed = 0;
  for (const candidate of candidates.values()) {
    try {
      const player = readJsonAssignment(await fetchPage(`https://www.youtube.com/watch?v=${candidate.id}`), 'ytInitialPlayerResponse');
      const film = verifiedFilm(player, candidate, new Date().toISOString());
      if (film) { verified.set(film.title.toLowerCase(), film); confirmed++; }
      console.log(`${film ? 'Verified' : 'Excluded'}: ${candidate.title}`);
    } catch (error) {
      // A transient network failure does not erase an earlier successful verification.
      if (candidate.verifiedAt) verified.set(candidate.title.toLowerCase(), candidate);
      console.warn(`Not refreshed: ${candidate.title}: ${error.code || error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!confirmed) throw new Error('No fresh verifications; catalog was not changed');
  const films = [...verified.values()].sort((a,b) => (b.views || 0) - (a.views || 0));
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, source.slice(0, start) + JSON.stringify(films, null, 2) + ';\n');
  await fs.rename(temporary, target);
  console.log(`Saved ${films.length} distinct films (${confirmed} fresh verifications).`);
}

module.exports = { readJsonAssignment, cleanTitle, candidateVideos, verifiedFilm };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
