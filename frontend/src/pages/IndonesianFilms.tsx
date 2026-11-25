import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Film, Play, Search } from 'lucide-react';
import { Empty } from '../components/Shared';
import { filterIndonesianFilms, indonesianFilms } from '../data/indonesianFilms';

export default function IndonesianFilms() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const selected = indonesianFilms.find(film => film.id === id);
  const query = params.get('q') || '';
  const source = params.get('source') || '';
  const films = filterIndonesianFilms(query, source);
  const sources = [...new Set(indonesianFilms.map(film => film.source))];
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  if (id && !selected) return <main className="container page"><Empty title="Film tidak ditemukan" /><Link className="button secondary" to="/indonesia">Koleksi Indonesia</Link></main>;

  if (selected) return <main className="container page">
    <div className="page-heading"><span className="eyebrow">FILM INDONESIA / {selected.source}</span><h1>{selected.title}</h1>
      <p>Film lengkap / {Math.round(selected.durationSeconds / 60)} menit / Player YouTube</p></div>
    <section aria-label={`Pemutar ${selected.title}`}>
      <div className="player">{playing ? <iframe key={attempt}
        src={`https://www.youtube.com/embed/${selected.id}?autoplay=1&playsinline=1`}
        title={`Tonton ${selected.title}`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
        onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />
        : <div className="player-placeholder"><button className="play-button" type="button" aria-label={`Putar ${selected.title}`}
          onClick={() => { setPlaying(true); setLoading(true); }}><Play size={25} fill="currentColor" /></button><span>Putar dari {selected.source}</span></div>}</div>
      {loading && <p role="status" className="server-note">Memuat player YouTube. Jika tidak muncul, coba lagi atau buka di YouTube.</p>}
      {failed && <p role="alert" className="server-note">Player tidak dapat dimuat. Coba lagi atau buka di YouTube.</p>}
      <div className="server-bar"><a className="button secondary" href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noopener noreferrer">Buka di YouTube</a>
        {playing && <button className="button secondary" onClick={() => { setAttempt(attempt + 1); setLoading(true); setFailed(false); }}>Muat ulang player</button>}
        <Link className="button secondary" to="/indonesia">Film lainnya</Link></div>
      <p className="server-note">Pilih kualitas dan subtitle yang tersedia melalui pengaturan player YouTube. Ketersediaan mengikuti penyedia dan wilayah penonton.</p>
      <p className="server-note">Izin embed diperiksa {new Date(selected.verifiedAt).toLocaleDateString('id-ID')}. Sumber: <a href={`https://www.youtube.com/channel/${selected.channelId}`} target="_blank" rel="noopener noreferrer">{selected.source}</a>.</p>
    </section>
  </main>;

  return <main className="container page">
    <div className="page-heading"><span className="eyebrow">CERITA DARI INDONESIA</span><h1>Film Indonesia</h1>
      <p>{indonesianFilms.length} film lengkap dari {sources.join(' dan ')}. Koleksi pilihan dengan izin embed yang telah diperiksa, bukan katalog lengkap.</p></div>
    <div className="browse-controls">
      <label className="search-field"><Search size={18} /><input aria-label="Cari di koleksi Indonesia" placeholder="Cari film Indonesia..." value={query} onChange={event => update('q', event.target.value)} /></label>
      <label className="browse-select">Sumber<select value={source} onChange={event => update('source', event.target.value)}><option value="">Semua sumber</option>{sources.map(item => <option key={item}>{item}</option>)}</select></label>
      <Link className="button secondary" to="/jelajah?site=movie&by=country&value=indonesia">Lihat juga katalog LK21</Link>
    </div>
    <p className="result-count" role="status">{films.length} film ditemukan</p>
    {films.length ? <div className="card-grid">{films.map(film => <Link className="movie-card" key={film.id} to={`/indonesia/${film.id}`}>
      <div className="poster"><img src={`https://i.ytimg.com/vi/${film.id}/hqdefault.jpg`} alt={`Cuplikan ${film.title}`} width="480" height="360" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />
        <div className="poster-placeholder"><Film size={28} /><span>{film.title}</span></div></div>
      <h3>{film.title}</h3><p>{film.source} / {Math.round(film.durationSeconds / 60)} menit</p>
    </Link>)}</div> : <><Empty title="Tidak ada film yang cocok" /><button className="button secondary" onClick={() => setParams({})}>Hapus filter</button></>}
  </main>;
}
