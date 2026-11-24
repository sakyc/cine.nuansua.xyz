import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Film, Play, Star } from 'lucide-react';
import { api } from '../services/api';
import { Empty, ErrorState, MovieCard, SectionHeader, Skeleton } from '../components/Shared';
import { HlsPlayer } from '../components/HlsPlayer';

function safeUrl(value: string): string | null {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export default function Detail() {
  const { type = 'movie', slug = '' } = useParams();
  const location = useLocation();
  const [provider, setProvider] = useState(0); const [playing, setPlaying] = useState(false); const [posterFailed, setPosterFailed] = useState(false);
  const query = useQuery({ queryKey: ['detail', type, slug], queryFn: ({ signal }) => api.detail(type, slug, signal), enabled: (type === 'movie' || type === 'series') && !!slug });
  const related = useQuery({ queryKey: ['home', 'recommendations'], queryFn: ({ signal }) => api.section('recommendations', signal) });
  useEffect(() => {
    if (query.data && location.hash === '#player') document.getElementById('player')?.scrollIntoView();
  }, [query.data, location.hash]);
  if (type !== 'movie' && type !== 'series') return <main className="container page"><Empty title="Halaman tidak ditemukan" /></main>;
  if (query.isPending) return <main className="container page"><Skeleton /></main>;
  if (query.isError) return <main className="container page"><ErrorState retry={() => void query.refetch()} /></main>;
  const item = query.data.data; const providers = (item.streamembed || []).map(entry => ({ ...entry, safe: safeUrl(entry.url) })).filter(entry => entry.safe);
  const selected = providers[provider] || providers[0];
  const sourceBase = safeUrl(import.meta.env.VITE_LK21_SOURCE_URL || 'https://tv13.lk21official.cc');
  const sourceUrl = sourceBase && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(slug)
    ? new URL(encodeURIComponent(slug), sourceBase.replace(/\/$/, '') + '/').href : null;
  const isRestricted = selected?.safe && new URL(selected.safe).hostname.toLowerCase() === 'videonode.de';
  return <main><div className="detail-background"><div className="container detail-hero"><div className="detail-poster">{item.poster && !posterFailed ? <img src={item.poster} alt={`Poster ${item.title}`} width="248" height="372" fetchPriority="high" onError={() => setPosterFailed(true)} /> : <div className="poster-placeholder"><Film size={32} /><span>{item.title}</span></div>}</div><div className="detail-copy"><span className="eyebrow">{type === 'movie' ? 'FILM' : 'SERIES'} PILIHAN</span><h1>{item.title}</h1><div className="meta-row">{item.rating != null && <span className="rating static"><Star size={11} fill="currentColor" /> {item.rating}</span>}<span className="quality static">HD</span>{item.year && <span>{item.year}</span>}{item.runtime && <span>{item.runtime}</span>}</div><div className="genre-tags">{item.genres?.map(genre => <span className="chip" key={genre}>{genre}</span>)}</div><p>{item.description || 'Sinopsis belum tersedia.'}</p><div className="actions"><a className="button light" href="#player"><Play size={15} fill="currentColor" /> Tonton Sekarang</a><Link className="button secondary" to="/">Kembali</Link></div></div></div></div><div className="container detail-content"><section id="player"><SectionHeader title="Tonton Sekarang" /><div className="player">{isRestricted ? <HlsPlayer type={type} slug={slug} /> : selected && playing ? <iframe title={`Player ${selected.provider}`} src={selected.safe || undefined} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <div className="player-placeholder">{selected ? <><button className="play-button" type="button" aria-label="Mulai menonton" onClick={() => setPlaying(true)}><Play size={25} fill="currentColor" /></button><span>Pilih tombol putar untuk memuat player</span></> : <span>Player belum tersedia untuk judul ini.</span>}</div>}</div>{isRestricted && sourceUrl && <div className="server-bar"><a className="external" href={sourceUrl} target="_blank" rel="noopener noreferrer">Buka halaman sumber <ExternalLink size={14} /></a></div>}{providers.some(entry => entry.safe && new URL(entry.safe).hostname.toLowerCase() !== 'videonode.de') && <div className="server-bar"><span>Pilih player</span>{providers.map((entry, index) => <button key={`${entry.provider}-${index}`} className={`chip ${provider === index ? 'active' : ''}`} onClick={() => { setProvider(index); setPlaying(false); }}>{entry.provider}</button>)}{selected?.safe && !isRestricted && <a href={selected.safe} target="_blank" rel="noopener noreferrer" className="external">Buka player <ExternalLink size={14} /></a>}</div>}</section><section className="detail-info"><div><h2>Sinopsis</h2><p>{item.description || 'Sinopsis belum tersedia.'}</p></div><aside><h3>Informasi</h3><p><span>Jenis</span>{type === 'movie' ? 'Film' : 'Series'}</p><p><span>Tahun</span>{item.year || '—'}</p><p><span>Negara</span>{item.countries?.join(', ') || '—'}</p><p><span>Genre</span>{item.genres?.join(', ') || '—'}</p></aside></section>{item.cast && item.cast.length > 0 && <section><SectionHeader title="Pemeran" /><div className="cast">{item.cast.map((name, i) => <span key={`${name}-${i}`}>{name}</span>)}</div></section>}<section><SectionHeader title="Rekomendasi lainnya" to="/films" />{related.isPending ? <Skeleton /> : related.isError ? <ErrorState retry={() => void related.refetch()} /> : related.data.data.length ? <div className="card-row">{related.data.data.filter(card => card.id !== item.id).map(card => <MovieCard key={card.id} card={card} />)}</div> : <Empty />}</section></div></main>;
}
