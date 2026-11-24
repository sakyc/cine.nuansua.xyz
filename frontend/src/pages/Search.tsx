import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../services/api';
import { Empty, ErrorState, MovieCard, Skeleton } from '../components/Shared';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const input = params.get('q') || ''; const [debounced, setDebounced] = useState(input.trim());
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 1000 ? requestedPage : 1;
  useEffect(() => { const timer = setTimeout(() => setDebounced(input.trim()), 350); return () => clearTimeout(timer); }, [input]);
  const query = useQuery({ queryKey: ['search', debounced, page], queryFn: ({ signal }) => api.search(debounced, page, signal), enabled: debounced.length >= 2 && debounced.length <= 100 });
  return <main className="container page"><div className="page-heading"><span className="eyebrow">TEMUKAN CERITAMU</span><h1>Pencarian</h1><p>Cari film atau series di koleksi kami.</p></div><label className="search-field"><SearchIcon size={20} /><span className="sr-only">Cari judul film atau series</span><input value={input} maxLength={100} onChange={event => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })} placeholder="Cari judul film atau series..." /></label>{input.trim().length < 2 ? <Empty title="Cari cerita berikutnya" text="Masukkan setidaknya dua karakter untuk mulai mencari." /> : input.trim() !== debounced || query.isPending ? <Skeleton /> : query.isError ? <ErrorState retry={() => void query.refetch()} /> : query.data && query.data.results.length ? <><p className="result-count">{query.data.total} hasil untuk “{debounced}”</p><div className="card-grid">{query.data.results.map(card => <MovieCard key={card.id} card={card} />)}</div>{query.data.totalPages > 1 && <div className="pagination"><button className="button secondary" disabled={page <= 1} onClick={() => setParams({ q: input, page: String(page - 1) })}>Sebelumnya</button><span>Halaman {page} dari {query.data.totalPages}</span><button className="button secondary" disabled={page >= query.data.totalPages || page >= 1000} onClick={() => setParams({ q: input, page: String(page + 1) })}>Selanjutnya</button></div>}</> : <Empty title="Film tidak ditemukan" text="Coba kata kunci lain atau jelajahi kategori." />}</main>;
}
