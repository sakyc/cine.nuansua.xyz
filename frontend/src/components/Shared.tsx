import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Film, Menu, Play, Search, Star, X } from 'lucide-react';
import type { Card } from '../services/api';

export function Logo() { return <Link to="/" className="logo"><span><Play size={15} fill="currentColor" /></span>SINEMAKU</Link>; }
export function Navbar() {
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (query.trim().length >= 2) { navigate(`/search?q=${encodeURIComponent(query.trim())}`); setMenu(false); } };
  return <header className="header container"><nav className="navbar" aria-label="Navigasi utama">
    <Logo /><div className={`navlinks ${menu ? 'open' : ''}`}>
      <NavLink to="/" end onClick={() => setMenu(false)}>Beranda</NavLink>
      <NavLink to="/films" onClick={() => setMenu(false)}>Film</NavLink>
      <NavLink to="/series" onClick={() => setMenu(false)}>Series</NavLink>
      <NavLink to="/genre/action" onClick={() => setMenu(false)}>Genre</NavLink>
      <NavLink to="/popular" onClick={() => setMenu(false)}>Populer</NavLink>
    </div>
    <form className="nav-search" onSubmit={submit}><Search size={16} /><input aria-label="Cari judul film atau series" placeholder="Cari judul film atau series..." value={query} onChange={event => setQuery(event.target.value)} /></form>
    <button className="menu-button" type="button" aria-label={menu ? 'Tutup menu' : 'Buka menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
  </nav></header>;
}
export function Footer() { return <footer className="footer"><div className="container"><div className="footer-top"><Logo /><div><Link to="/">Beranda</Link><Link to="/genre/action">Genre</Link><Link to="/popular">Populer</Link></div></div><div className="footer-bottom">© {new Date().getFullYear()} Sinemaku. Temukan cerita berikutnya.</div></div></footer>; }
export function MovieCard({ card }: { card: Card }) {
  const [failed, setFailed] = useState(false);
  return <Link className="movie-card" to={`/${card.type}/${encodeURIComponent(card.slug)}`} viewTransition>
    <div className="poster">{card.poster && !failed ? <img src={card.poster} alt={`Poster ${card.title}`} width="200" height="290" loading="lazy" onError={() => setFailed(true)} /> : <div className="poster-placeholder"><Film size={28} /><span>{card.title}</span></div>}
      {card.rating != null && <span className="rating"><Star size={11} fill="currentColor" /> {card.rating}</span>}<span className="quality">HD</span>
    </div><h3>{card.title}</h3><p>{[card.year, card.type === 'series' ? 'Series' : 'Film'].filter(Boolean).join(' · ')}</p>
  </Link>;
}
export function SectionHeader({ title, to }: { title: string; to?: string }) { return <div className="section-header"><h2>{title}</h2>{to && <Link to={to}>Lihat semua <ArrowRight size={15} /></Link>}</div>; }
export function Skeleton({ count = 6 }: { count?: number }) { return <div className="card-grid" aria-label="Memuat" aria-busy="true">{Array.from({ length: count }, (_, i) => <div className="skeleton-card" key={i}><div /><span /><span /></div>)}</div>; }
export function Empty({ title = 'Belum ada hasil', text = 'Coba kata kunci atau pilihan lainnya.' }: { title?: string; text?: string }) { return <div className="state"><Search size={28} /><h2>{title}</h2><p>{text}</p></div>; }
export function ErrorState({ retry }: { retry: () => void }) { return <div className="state" role="alert"><h2>Data belum bisa dimuat</h2><p>Periksa koneksi atau coba lagi sebentar.</p><button className="button secondary" onClick={retry}>Coba lagi</button></div>; }
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ErrorState retry={() => this.setState({ failed: false })} /> : this.props.children; }
}
export const genres = ['Semua', 'Action', 'Drakor', 'Horror', 'Komedi', 'Romance', 'Keluarga'];
export const genreSlug: Record<string, string> = { Action: 'action', Horror: 'horror', Komedi: 'comedy', Romance: 'romance', Keluarga: 'family' };
export function Chips({ selected }: { selected?: string }) { return <div className="chips" aria-label="Kategori">{genres.map(genre => <Link key={genre} className={`chip ${selected === genre || (!selected && genre === 'Semua') ? 'active' : ''}`} to={genre === 'Semua' ? '/' : genre === 'Drakor' ? '/drakor' : `/genre/${genreSlug[genre]}`}>{genre}</Link>)}</div>; }
