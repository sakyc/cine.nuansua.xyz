import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Chips, Empty, ErrorState, MovieCard, Skeleton } from '../components/Shared';

export default function Listing({ mode }: { mode: 'genre' | 'films' | 'series' | 'popular' | 'drakor' }) {
  const { slug = 'action' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') || 1); const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000 ? rawPage : 1;
  const section = mode === 'films' ? 'latest-movies' : mode === 'series' ? 'series-update' : mode === 'drakor' ? 'drakor' : 'top-month';
  const category = useQuery({ queryKey: ['category', slug, page], queryFn: ({ signal }) => api.category(slug, page, signal), enabled: mode === 'genre' });
  const home = useQuery({ queryKey: ['home', section], queryFn: ({ signal }) => api.section(section, signal), enabled: mode !== 'genre' });
  const pending = mode === 'genre' ? category.isPending : home.isPending;
  const error = mode === 'genre' ? category.isError : home.isError;
  const items = mode === 'genre' ? category.data?.items : home.data?.data;
  const title = mode === 'genre' ? slug.replace(/-/g, ' ') : mode === 'films' ? 'Film Terbaru' : mode === 'series' ? 'Series Update' : mode === 'drakor' ? 'Drakor' : 'Populer Bulan Ini';
  return <main className="container page"><div className="page-heading"><span className="eyebrow">JELAJAHI KOLEKSI</span><h1>{title}</h1><p>Temukan cerita pilihan untuk menemani harimu.</p></div><Chips />{pending ? <Skeleton count={12} /> : error ? <ErrorState retry={() => void (mode === 'genre' ? category.refetch() : home.refetch())} /> : items?.length ? <div className="card-grid">{items.map(card => <MovieCard key={card.id} card={card} />)}</div> : <Empty />}{mode === 'genre' && category.data && category.data.totalPages > 1 && <div className="pagination"><button className="button secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Sebelumnya</button><span>Halaman {page} dari {category.data.totalPages}</span><button className="button secondary" disabled={page >= category.data.totalPages} onClick={() => setParams({ page: String(page + 1) })}>Selanjutnya</button></div>}</main>;
}
