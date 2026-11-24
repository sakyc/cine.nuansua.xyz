import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Play, Star } from 'lucide-react';
import { api } from '../services/api';
import { Empty, ErrorState, MovieCard, SectionHeader, Skeleton } from '../components/Shared';
import { ServerPlayer } from '../components/ServerPlayer';
import { EpisodePlayer } from '../components/EpisodePlayer';
import { SchedulePanel } from '../components/SchedulePanel';

function safeUrl(value: string): string | null {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export default function Detail() {
  const { type = 'movie', slug = '' } = useParams();
  const location = useLocation();
  const [posterFailed, setPosterFailed] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ['detail', type, slug], queryFn: ({ signal }) => api.detail(type, slug, signal), enabled: (type === 'movie' || type === 'series') && !!slug });
  const related = useQuery({ queryKey: ['home', 'recommendations'], queryFn: ({ signal }) => api.section('recommendations', signal) });
  useEffect(() => {
    if (query.data && location.hash === '#player') document.getElementById('player')?.scrollIntoView();
  }, [query.data, location.hash]);
  if (type !== 'movie' && type !== 'series') return <main className="container page"><Empty title="Halaman tidak ditemukan" /></main>;
  if (query.isPending) return <main className="container page"><Skeleton /></main>;
  if (query.isError) return <main className="container page"><ErrorState retry={() => void query.refetch()} /></main>;
  const item = query.data.data;
  const sourceBase = safeUrl(import.meta.env.VITE_LK21_SOURCE_URL || 'https://tv13.lk21official.cc');
  const sourceUrl = sourceBase && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(slug)
    ? new URL(encodeURIComponent(slug), sourceBase.replace(/\/$/, '') + '/').href : null;
  const seasons = (item.seasons || []).filter(season => season.episodes?.length);
  return <main><div className="detail-background"><div className="container detail-hero"><div className="detail-poster">{item.poster && !posterFailed ? <img src={item.poster} alt={`Poster ${item.title}`} width="248" height="372" fetchPriority="high" onError={() => setPosterFailed(true)} /> : <div className="poster-placeholder"><Film size={32} /><span>{item.title}</span></div>}</div><div className="detail-copy"><span className="eyebrow">{type === 'movie' ? 'FILM' : 'SERIES'} PILIHAN</span><h1>{item.title}</h1><div className="meta-row">{item.rating != null && <span className="rating static"><Star size={11} fill="currentColor" /> {item.rating}</span>}<span className="quality static">HD</span>{item.year && <span>{item.year}</span>}{item.runtime && <span>{item.runtime}</span>}</div><div className="genre-tags">{item.genres?.map(genre => <span className="chip" key={genre}>{genre}</span>)}</div><p>{item.description || 'Sinopsis belum tersedia.'}</p><div className="actions"><a className="button light" href="#player"><Play size={15} fill="currentColor" /> Tonton Sekarang</a><Link className="button secondary" to="/">Kembali</Link></div></div></div></div><div className="container detail-content"><section id="player"><SectionHeader title="Tonton Sekarang" />{type === 'series' ? <EpisodePlayer seasons={seasons} selected={params.get('ep')} onSelect={ep => setParams({ ep }, { replace: true })} /> : <ServerPlayer type="movie" slug={slug} streams={item.streamembed || []} sourceUrl={sourceUrl} />}</section><section className="detail-info"><div><h2>Sinopsis</h2><p>{item.description || 'Sinopsis belum tersedia.'}</p></div><aside><h3>Informasi</h3><p><span>Jenis</span>{type === 'movie' ? 'Film' : 'Series'}</p>{type === 'series' && <SchedulePanel slug={slug} />}{type === 'series' && <p><span>Episode</span>{seasons.reduce((sum, season) => sum + season.episodes.length, 0) || '—'}</p>}<p><span>Tahun</span>{item.year || '—'}</p><p><span>Negara</span>{item.countries?.join(', ') || '—'}</p><p><span>Genre</span>{item.genres?.join(', ') || '—'}</p></aside></section>{item.cast && item.cast.length > 0 && <section><SectionHeader title="Pemeran" /><div className="cast">{item.cast.map((name, i) => <span key={`${name}-${i}`}>{name}</span>)}</div></section>}<section><SectionHeader title="Rekomendasi lainnya" to="/films" />{related.isPending ? <Skeleton /> : related.isError ? <ErrorState retry={() => void related.refetch()} /> : related.data.data.length ? <div className="card-row">{related.data.data.filter(card => card.id !== item.id).map(card => <MovieCard key={card.id} card={card} />)}</div> : <Empty />}</section></div></main>;
}
