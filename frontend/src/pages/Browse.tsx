import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { BrowseBy, BrowseSite } from '../services/api';
import { Empty, ErrorState, MovieCard, Skeleton } from '../components/Shared';

const byLabels: Record<BrowseBy, string> = { genre: 'Genre', country: 'Negara', year: 'Tahun' };

/**
 * Browse films or series by one genre, country or year. The source lists one category at a time
 * (up to 50 pages each), so choosing another category replaces the previous one.
 * State lives in the URL: /jelajah?site=drama&by=country&value=south-korea&page=2
 */
export default function Browse() {
  const [params, setParams] = useSearchParams();
  const site: BrowseSite = params.get('site') === 'drama' ? 'drama' : 'movie';
  const rawBy = params.get('by');
  const by: BrowseBy = rawBy === 'country' || rawBy === 'year' ? rawBy : 'genre';
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 50 ? rawPage : 1;
  const filters = useQuery({ queryKey: ['filters', site], queryFn: ({ signal }) => api.filters(site, signal), staleTime: 60 * 60_000 });
  const choices = filters.data?.data
    ? by === 'year' ? filters.data.data.years.map(year => ({ slug: String(year), name: String(year) }))
      : by === 'country' ? filters.data.data.countries : filters.data.data.genres
    : [];
  const fallback = by === 'country' ? (site === 'drama' ? 'south-korea' : 'usa') : by === 'year' ? String(new Date().getFullYear()) : 'action';
  const requested = params.get('value') || '';
  const value = /^[a-z0-9][a-z0-9-]{0,60}$/.test(requested) ? requested : fallback;
  const list = useQuery({
    queryKey: ['browse', site, by, value, page],
    queryFn: ({ signal }) => api.browse(site, by, value, page, signal),
  });
  const update = (next: Record<string, string>) => setParams({ site, by, value, page: '1', ...next });
  const label = choices.find(choice => choice.slug === value)?.name || value.replace(/-/g, ' ');

  return <main className="container page">
    <div className="page-heading"><span className="eyebrow">JELAJAHI</span><h1>{site === 'drama' ? 'Series' : 'Film'} · {byLabels[by]}: {label}</h1>
      <p>Pilih jenis, lalu satu kategori: genre, negara, atau tahun.</p></div>
    <div className="browse-controls">
      <div className="chips" role="group" aria-label="Jenis">
        <button className={`chip ${site === 'movie' ? 'active' : ''}`} onClick={() => update({ site: 'movie', value: by === 'country' ? 'usa' : value })}>Film</button>
        <button className={`chip ${site === 'drama' ? 'active' : ''}`} onClick={() => update({ site: 'drama', value: by === 'country' ? 'south-korea' : value })}>Series &amp; Drakor</button>
      </div>
      <div className="chips" role="group" aria-label="Kategori">
        {(Object.keys(byLabels) as BrowseBy[]).map(item => <button key={item} className={`chip ${by === item ? 'active' : ''}`}
          onClick={() => update({ by: item, value: item === 'country' ? (site === 'drama' ? 'south-korea' : 'usa') : item === 'year' ? String(new Date().getFullYear()) : 'action' })}>{byLabels[item]}</button>)}
      </div>
      <label className="browse-select">{byLabels[by]}
        <select value={value} onChange={event => update({ value: event.target.value })} disabled={!choices.length} aria-label={`Pilih ${byLabels[by].toLowerCase()}`}>
          {!choices.some(choice => choice.slug === value) && <option value={value}>{label}</option>}
          {choices.map(choice => <option key={choice.slug} value={choice.slug}>{choice.name}</option>)}
        </select>
      </label>
    </div>
    {list.isPending ? <Skeleton count={12} />
      : list.isError ? <ErrorState retry={() => void list.refetch()} />
        : list.data.items.length ? <div className="card-grid">{list.data.items.map(card => <MovieCard key={card.id} card={card} />)}</div>
          : <Empty title="Belum ada judul" text="Coba kategori lain." />}
    {list.data && list.data.totalPages > 1 && <div className="pagination">
      <button className="button secondary" disabled={page <= 1} onClick={() => setParams({ site, by, value, page: String(page - 1) })}>Sebelumnya</button>
      <span>Halaman {page} dari {list.data.totalPages}</span>
      <button className="button secondary" disabled={page >= list.data.totalPages} onClick={() => setParams({ site, by, value, page: String(page + 1) })}>Selanjutnya</button>
    </div>}
  </main>;
}
