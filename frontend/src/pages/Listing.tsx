import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Chips, Empty, ErrorState, MovieCard, Skeleton } from '../components/Shared';

// Series listings from LK21's series site: drakor (South Korea), all ongoing series, all finished series.
const seriesPaths = { drakor: 'country/south-korea', ongoing: 'series/ongoing', complete: 'series/complete' } as const;
const seriesTabs = [['/drakor', 'drakor', 'Drakor'], ['/ongoing', 'ongoing', 'Sedang Tayang'], ['/tamat', 'complete', 'Tamat']] as const;

export default function Listing({ mode }: { mode: 'genre' | 'films' | 'series' | 'popular' | 'drakor' | 'ongoing' | 'complete' }) {
  const { slug = 'action' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') || 1); const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000 ? rawPage : 1;
  const section = mode === 'films' ? 'latest-movies' : mode === 'series' ? 'series-update' : mode === 'drakor' ? 'drakor' : 'top-month';
  // Genre pages and Drakor (South Korean series from LK21's series site) are paginated listings.
  const seriesPath = mode === 'drakor' || mode === 'ongoing' || mode === 'complete' ? seriesPaths[mode] : null;
  const paged = mode === 'genre' || !!seriesPath;
  const category = useQuery({ queryKey: ['category', mode, slug, page], queryFn: ({ signal }) => seriesPath ? api.drama(seriesPath, page, signal) : api.category(slug, page, signal), enabled: paged });
  const home = useQuery({ queryKey: ['home', section], queryFn: ({ signal }) => api.section(section, signal), enabled: !paged });
  const pending = paged ? category.isPending : home.isPending;
  const error = paged ? category.isError : home.isError;
  const items = paged ? category.data?.items : home.data?.data;
  const title = mode === 'genre' ? slug.replace(/-/g, ' ') : mode === 'films' ? 'Film Terbaru' : mode === 'series' ? 'Series Update' : mode === 'drakor' ? 'Drakor' : mode === 'ongoing' ? 'Series Sedang Tayang' : mode === 'complete' ? 'Series Tamat' : 'Populer Bulan Ini';
  return <main className="container page"><div className="page-heading"><span className="eyebrow">JELAJAHI KOLEKSI</span><h1>{title}</h1><p>{mode === 'ongoing' ? 'Series yang masih merilis episode baru. Episode baru muncul otomatis.' : mode === 'complete' ? 'Series yang sudah selesai, bisa ditonton sampai habis.' : 'Temukan cerita pilihan untuk menemani harimu.'}</p></div>{seriesPath ? <div className="chips" aria-label="Kategori series">{seriesTabs.map(([to, key, name]) => <Link key={to} to={to} className={`chip ${mode === key ? 'active' : ''}`}>{name}</Link>)}</div> : <Chips />}{pending ? <Skeleton count={12} /> : error ? <ErrorState retry={() => void (paged ? category.refetch() : home.refetch())} /> : items?.length ? <div className="card-grid">{items.map(card => <MovieCard key={card.id} card={card} />)}</div> : <Empty />}{paged && category.data && category.data.totalPages > 1 && <div className="pagination"><button className="button secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Sebelumnya</button><span>Halaman {page} dari {category.data.totalPages}</span><button className="button secondary" disabled={page >= category.data.totalPages} onClick={() => setParams({ page: String(page + 1) })}>Selanjutnya</button></div>}</main>;
}
