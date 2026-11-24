import { catalog } from './catalog';
import { isJsonObject } from '../types/catalog';

/**
 * Estimates when new episodes of a series appear, from the upload times of its latest episodes.
 * The source has no broadcast schedule, so this reports the weekdays recent episodes were uploaded
 * (usually shortly after the original broadcast) and whether the series still looks active.
 */
const sample = 6;
const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const recentDays = 14;

export type Schedule = {
  days: string[];
  lastEpisode: { title: string; number: number | null; published: string } | null;
  active: boolean;
  basedOn: number;
};

export function summarizeSchedule(uploads: Array<{ title: string; number: number | null; published: string }>, now = Date.now()): Schedule {
  const dated = uploads
    .map(item => ({ ...item, time: Date.parse(`${item.published}Z`) }))
    .filter(item => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time);
  if (!dated.length) return { days: [], lastEpisode: null, active: false, basedOn: 0 };
  // Upload times have no timezone; they are read as-is, so the weekday matches the source's own date.
  const counts = new Map<number, number>();
  for (const item of dated) {
    const day = new Date(item.time).getUTCDay();
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  // A weekday counts when it holds at least a quarter of recent uploads (filters one-off catch-ups).
  const days = [...counts.entries()]
    .filter(([, count]) => count >= Math.max(1, Math.ceil(dated.length / 4)))
    .map(([day]) => day)
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map(day => weekdays[day]);
  const latest = dated[0];
  return {
    days,
    lastEpisode: { title: latest.title, number: latest.number, published: latest.published },
    active: now - latest.time <= recentDays * 86400_000,
    basedOn: dated.length,
  };
}

export async function getSchedule(slug: string): Promise<Schedule> {
  const { data } = await catalog.getDetail('series', slug);
  const episodes = (Array.isArray(data.seasons) ? data.seasons : [])
    .flatMap(season => isJsonObject(season) && Array.isArray(season.episodes) ? season.episodes : [])
    .filter(isJsonObject)
    .filter(episode => typeof episode.id === 'string');
  const uploads: Array<{ title: string; number: number | null; published: string }> = [];
  // Newest episodes are last in season order; episode pages are cached and also used for playback.
  for (const episode of episodes.slice(-sample).reverse()) {
    try {
      const { data: detail } = await catalog.getDetail('episode', episode.id as string);
      if (typeof detail.published === 'string') {
        uploads.push({
          title: typeof episode.title === 'string' ? episode.title : String(episode.id),
          number: typeof episode.episodeNumber === 'number' ? episode.episodeNumber : null,
          published: detail.published,
        });
      }
    } catch { /* skip an episode that cannot be loaded */ }
  }
  return summarizeSchedule(uploads);
}
