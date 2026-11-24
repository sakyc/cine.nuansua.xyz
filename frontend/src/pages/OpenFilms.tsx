import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Film, Play } from 'lucide-react';

const films = [
  { id: 'Sintel', title: 'Sintel', year: 2010, creator: 'Blender Foundation', license: 'https://creativecommons.org/licenses/by/3.0/', description: 'Sebuah kisah fantasi tentang perjalanan Sintel mencari naga kecil yang ia selamatkan.' },
  { id: 'ElephantsDream', title: 'Elephants Dream', year: 2006, creator: 'Orange Open Movie Project Studio', license: 'https://creativecommons.org/licenses/by/3.0/us/', description: 'Dua tokoh menjelajahi mesin misterius dalam film animasi terbuka.' },
  { id: 'BigBuckBunny_328', title: 'Big Buck Bunny', year: 2008, creator: 'Blender Foundation', license: 'https://creativecommons.org/licenses/by/3.0/us/', description: 'Seekor kelinci menghadapi tiga hewan pengganggu dalam film animasi pendek.' },
] as const;

export default function OpenFilms() {
  const { id } = useParams();
  const [playing, setPlaying] = useState(false);
  const selected = films.find(film => film.id === id);
  if (id && !selected) return <main className="container page"><h1>Film tidak ditemukan</h1><p><Link to="/film-terbuka">Lihat film terbuka</Link></p></main>;

  if (!selected) return <main className="container page"><div className="page-heading"><span className="eyebrow">BISA DITONTON</span><h1>Film Terbuka</h1><p>Film pendek berlisensi terbuka dari Internet Archive. Koleksi ini berbeda dari katalog LK21.</p></div><div className="card-grid">{films.map(film => <Link key={film.id} className="movie-card" to={`/film-terbuka/${film.id}`}><div className="poster"><img src={`https://archive.org/services/img/${film.id}`} alt={`Poster ${film.title}`} width="200" height="300" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} /><div className="poster-placeholder"><Film size={28} /><span>{film.title}</span></div></div><h3>{film.title}</h3><p>{film.year} · Film pendek</p></Link>)}</div></main>;

  return <main className="container page"><div className="page-heading"><span className="eyebrow">FILM TERBUKA · {selected.year}</span><h1>{selected.title}</h1><p>{selected.description}</p></div><section aria-label="Pemutar film"><div className="player">{playing ? <iframe src={`https://archive.org/embed/${selected.id}`} title={`Tonton ${selected.title}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <div className="player-placeholder"><button className="play-button" type="button" aria-label={`Putar ${selected.title}`} onClick={() => setPlaying(true)}><Play size={25} fill="currentColor" /></button><span>Putar film melalui Internet Archive</span></div>}</div><p style={{ marginTop: 16 }}><a className="external" href={`https://archive.org/details/${selected.id}`} target="_blank" rel="noopener noreferrer">Buka di Internet Archive</a></p><p style={{ marginTop: 16 }} className="result-count">{selected.title} — {selected.creator} · <a href={selected.license} target="_blank" rel="noopener noreferrer">Lisensi Creative Commons Attribution</a></p><p style={{ marginTop: 16 }}><Link className="button secondary" to="/film-terbuka">Film terbuka lainnya</Link></p></section></main>;
}
