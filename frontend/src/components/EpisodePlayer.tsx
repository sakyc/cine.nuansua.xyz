import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import type { Season } from '../services/api';
import { ServerPlayer } from './ServerPlayer';

/** Season tabs, episode grid, and the player for the chosen episode (kept in the URL as ?ep=<slug>). */
export function EpisodePlayer({ seasons, selected, onSelect }: { seasons: Season[]; selected: string | null; onSelect: (slug: string) => void }) {
  const all = seasons.flatMap(season => season.episodes);
  const current = all.find(episode => episode.id === selected) || all[0];
  // The season tab shown is the one the viewer opened, otherwise the season of the playing episode.
  const [viewedSeason, setViewedSeason] = useState<string | null>(null);
  const choose = (slug: string) => { setViewedSeason(null); onSelect(slug); };
  const episode = useQuery({
    queryKey: ['episode', current?.id],
    queryFn: ({ signal }) => api.episode(current!.id, signal),
    enabled: !!current,
  });
  if (!current) return <div className="player"><div className="player-placeholder"><span>Episode belum tersedia untuk series ini.</span></div></div>;
  const index = all.indexOf(current);
  const season = seasons.find(item => item.id === viewedSeason)
    || seasons.find(item => item.episodes.some(ep => ep.id === current.id)) || seasons[0];

  return <>
    <p className="episode-now">Season {current.seasonNumber} · {current.title}</p>
    {episode.isPending ? <div className="player"><div className="player-placeholder"><span role="status">Menyiapkan episode…</span></div></div>
      : episode.isError ? <div className="player"><div className="player-placeholder"><span>Episode belum dapat dimuat.</span><button className="button secondary" onClick={() => void episode.refetch()}>Coba lagi</button></div></div>
        : <ServerPlayer key={current.id} type="episode" slug={current.id} streams={episode.data.data.streamembed || []} />}
    <div className="episode-nav">
      <button className="button secondary" disabled={index <= 0} onClick={() => choose(all[index - 1].id)}><ChevronLeft size={15} /> Sebelumnya</button>
      <button className="button secondary" disabled={index >= all.length - 1} onClick={() => choose(all[index + 1].id)}>Berikutnya <ChevronRight size={15} /></button>
    </div>
    {seasons.length > 1 && <div className="server-bar season-tabs"><span>Season</span>
      {seasons.map(item => <button key={item.id} className={`chip ${item.id === season?.id ? 'active' : ''}`} onClick={() => setViewedSeason(item.id)}>{item.name}</button>)}
    </div>}
    <div className="episode-grid" aria-label="Daftar episode">
      {season?.episodes.map(item => <button key={item.id} className={`chip ${item.id === current.id ? 'active' : ''}`} onClick={() => choose(item.id)}>{item.episodeNumber || item.title}</button>)}
    </div>
  </>;
}
