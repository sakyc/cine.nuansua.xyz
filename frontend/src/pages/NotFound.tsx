import { Link } from 'react-router-dom';
export default function NotFound() { return <main className="not-found container"><span className="eyebrow">ERROR 404</span><strong>404</strong><h1>Halaman tidak ditemukan</h1><p>Sepertinya halaman yang kamu cari tidak tersedia.</p><Link className="button primary" to="/">Kembali ke Beranda</Link></main>; }
