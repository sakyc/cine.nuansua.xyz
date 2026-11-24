import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Play, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../services/api';
import { Chips, Empty, ErrorBoundary, ErrorState, MovieCard, SectionHeader, Skeleton } from '../components/Shared';

function MovieSection({ title, name, to }: { title: string; name: string; to: string }) {
  const query = useQuery({ queryKey: ['home', name], queryFn: ({ signal }) => api.section(name, signal) });
  return <section className="home-section"><SectionHeader title={title} to={to} />{query.isPending ? <Skeleton /> : query.isError ? <ErrorState retry={() => void query.refetch()} /> : query.data.data.length ? <div className="card-row">{query.data.data.map(card => <MovieCard key={card.id} card={card} />)}</div> : <Empty />}</section>;
}
function Hero() {
  const [selected, setSelected] = useState(0);
  const reduceMotion = useReducedMotion();
  const query = useQuery({ queryKey: ['home', 'film-unggulan'], queryFn: ({ signal }) => api.section('film-unggulan', signal) });
  if (query.isPending) return <div className="hero-loading container" aria-busy="true"><div className="hero-placeholder" /></div>;
  if (query.isError) return <div className="container hero-loading"><ErrorState retry={() => void query.refetch()} /></div>;
  const cards = query.data.data.slice(0, 4); const item = cards[selected] ?? cards[0];
  if (!item) return <div className="hero-loading container"><Empty title="Film unggulan belum tersedia" /></div>;
  return <div className="hero container"><motion.div className="hero-copy" key={item.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><span className="eyebrow">PILIHAN EDITOR <b>·</b> FILM UNGGULAN</span><h1>{item.title}</h1><div className="meta-row">{item.rating != null && <span className="rating static"><Star size={11} fill="currentColor" /> {item.rating}</span>}<span className="quality static">HD</span>{item.year && <span>{item.year}</span>}{item.duration && <span>{item.duration}</span>}{item.genre && <span>{item.genre}</span>}</div><p>Temukan cerita menarik pilihan kami dan nikmati pengalaman menonton berikutnya.</p><div className="actions"><Link className="button light" to={`/${item.type}/${item.slug}#player`}><Play size={15} fill="currentColor" /> Tonton Sekarang</Link><Link className="button secondary" to={`/${item.type}/${item.slug}`}>Detail <ArrowRight size={15} /></Link></div></motion.div><div className="hero-tabs">{cards.map((card, i) => <button key={card.id} type="button" className={i === selected ? 'selected' : ''} onClick={() => setSelected(i)} aria-pressed={i === selected}><small>{String(i + 1).padStart(2, '0')} · {i === selected ? 'SEDANG TAYANG' : card.type.toUpperCase()}</small><span>{card.title}</span></button>)}</div></div>;
}
export default function Home() { return <><div className="hero-background"><ErrorBoundary><Hero /></ErrorBoundary></div><main className="container main-sections"><Chips /><ErrorBoundary><MovieSection title="Film Terbaru" name="latest-movies" to="/films" /></ErrorBoundary><ErrorBoundary><MovieSection title="Top Bulan Ini" name="top-month" to="/popular" /></ErrorBoundary><ErrorBoundary><MovieSection title="Sorotan Series" name="series-update" to="/series" /></ErrorBoundary></main></>; }
