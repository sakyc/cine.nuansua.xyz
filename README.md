# layarkaca21-api

REST API katalog film dan serial berbasis Express, TypeScript, dan PostgreSQL.
Metadata diambil dari sumber LK21 lalu disimpan sebagai katalog lokal dan snapshot
respons terakhir yang berhasil. File video tidak disimpan oleh API ini.

## Menjalankan lokal (Windows CMD)

Prasyarat: Node.js 20+, npm, dan Docker Desktop yang sedang berjalan.
Untuk instalasi baru, salin `.env.example` menjadi `.env.local`. Jangan menimpa
`.env.local` yang sudah berisi konfigurasi. Ganti password contoh pada
`POSTGRES_PASSWORD`, `DATABASE_URL`, dan `DIRECT_URL` dengan password yang sama,
serta isi `CRON_SECRET` dengan nilai acak yang panjang.

```bat
cd /d D:\Nuansauai\api\lk21
npm ci
docker compose --env-file .env.local -f docker-compose.local.yml up -d --wait
npm run db:migrate
npm run build
npm run catalog:refresh
npm run dev
```

PostgreSQL lokal memakai port `127.0.0.1:55432` dan volume persisten.
Endpoint katalog memerlukan database; Redis tetap opsional.
Jangan menghapus volume jika ingin mempertahankan data saat sumber tidak tersedia.
Server default: http://localhost:3000. Dokumentasi: http://localhost:3000/api-docs.
Jika port 3000 sudah dipakai, hentikan instance API sebelumnya atau ubah `PORT`.

## Mencoba tanpa frontend

```bat
curl "http://localhost:3000/api/home/latest-movies"
curl "http://localhost:3000/api/search?q=social&page=1&limit=20"
curl "http://localhost:3000/api/home/genre/action?page=1"
```

Salin `id` dari daftar, lalu buka `/api/movie/ID_FILM` atau `/api/series/ID_SERIES`
sesuai `type`. URL `data.streamembed[].url` dapat dibuka di browser untuk mencoba
player penyedia. Metadata yang berhasil tidak menjamin video dapat diputar;
player, domain video, dan masa berlaku tautannya tetap bergantung pada penyedia.
Data musim/episode series masih memakai logika lama dan belum dijamin lengkap.

Frontend dapat mencoba P2P melalui sesi HLS eksperimental. Backend menerima
`POST /api/playback/movie/:slug` atau `/api/playback/series/:slug`, kemudian
mengembalikan URL playlist sementara. Segmen berasal dari manifest yang
divalidasi; sumber dapat berubah atau kedaluwarsa. Sesi berada di memori proses,
berlaku maksimal empat jam, dan tidak bertahan setelah restart. Server menjadi
perantara trafik video; implementasi ini belum dilengkapi autentikasi, pembatasan
per pengguna, penyimpanan sesi bersama, atau kontrol bandwidth, sehingga belum
siap untuk diakses publik. Format selain HLS yang didukung belum ditangani.

Subtitle otomatis untuk film menggunakan OpenSubtitles jika
`OPENSUBTITLES_API_KEY` dikonfigurasi di `.env.local`; buat API consumer di
https://www.opensubtitles.com/consumers dan restart backend setelah mengaturnya.
Pencarian hanya menerima judul dan tahun yang cocok, subtitle dipilih dari hasil
yang tersedia, dan unduhan tunduk pada kuota serta ketentuan penyedia. Subtitle
series otomatis belum didukung karena identitas episode belum andal. Waktu
subtitle belum tentu cocok dengan versi video. Jangan kirim key ke frontend.

## Keamanan

- Rate limit per IP per menit: umum `RATE_LIMIT_PER_MINUTE` (default 120), endpoint
  yang bisa memicu request ke LK21 (detail, pencarian, kategori) setengahnya,
  pembuatan sesi playback 10, segmen video 600, dan subtitle 20. Melebihi batas
  menghasilkan `429`. Request dengan `Authorization: Bearer <CRON_SECRET>` tidak dibatasi.
  Penyimpanan limit ada di memori proses, sehingga pada serverless/beberapa instance
  batasnya berlaku per instance.
- Di belakang reverse proxy (Vercel, Nginx, Cloudflare) set `TRUST_PROXY=1` agar
  limit dan sesi playback memakai IP pengguna, bukan IP proxy.
- `CORS_ORIGINS` berisi daftar origin frontend dipisahkan koma. Jika kosong,
  development mengizinkan semua origin dan production hanya same-origin.
- `/api/debug/upstream` memerlukan header admin yang sama dengan `/api/cron`.
- Playback aktif secara default di development dan mati di production kecuali
  `PLAYBACK_ENABLED=true`. Sesi terikat ke IP pembuatnya; URL playlist dari IP lain
  menghasilkan 404, dan setiap IP memegang paling banyak `PLAYBACK_SESSIONS_PER_IP`
  sesi (sesi tertua dibuang). Pengguna yang IP-nya berganti di tengah tontonan
  perlu menekan "Coba lagi".

## Cache, fallback, dan pencarian

- Semua slider berbagi satu snapshot beranda. Daftar tidak lagi mengambil detail
  setiap kartu. Field tambahan seperti `synopsis`, `sutradara`, dan `bintangFilm`
  tetap ada tetapi kosong pada kartu; ambil metadata lengkap lewat endpoint detail.
- Snapshot segar dikembalikan langsung. Setelah TTL, respons lama segera diberikan
  sambil refresh berjalan di latar belakang. Kegagalan upstream tidak menghapus
  snapshot terakhir. Data tetap tersedia setelah proses API restart.
- `meta.source` bernilai `catalog` atau `upstream`, `meta.stale` menunjukkan TTL
  sudah terlewati, dan `meta.updatedAt` adalah waktu pengambilan snapshot.
  Metadata ini berlaku untuk snapshot, bukan validitas video.
- Jika belum pernah tersimpan dan sumber gagal, respons tetap bisa 502/404.
  Database tidak tersedia atau migrasi belum diterapkan menghasilkan 503.
- `/api/search?q=...&page=1&limit=20` mencari judul dalam PostgreSQL, dengan
  pencocokan awalan kata tanpa membedakan huruf besar/kecil. Semua kata harus cocok.
  `q`: 2-100 karakter, `page`: 1-1000, `limit`: 1-50. Respons berisi `results`,
  `total`, `totalPages`, `page`, `limit`, `query`, dan `meta`.
- Pencarian hanya mencakup judul yang telah masuk katalog, bukan seluruh LK21.
  Refresh mengindeks beranda dan halaman populer (`CATALOG_SEED_PAGES`, default 3,
  maksimal 10). Kategori yang dikunjungi juga menambahkan judul ke indeks.
  Hasil kosong adalah `200` dengan `results: []`.
- Redis pada endpoint lainnya hanya menyimpan respons sukses. Namespace cache
  baru mengabaikan error yang terlanjur tersimpan versi sebelumnya.

Sumber default: `https://tv13.lk21official.cc`. Ganti `LK21_BASE_URL` jika domain
berubah, lalu restart API. `LK21_BASE_URLS` menerima daftar domain dipisahkan koma
dan memiliki prioritas lebih tinggi. Failover mencoba domain berikutnya saat
terjadi gangguan jaringan, 401/403/429, atau 5xx. Domain cadangan harus memiliki
struktur halaman yang kompatibel dan dapat dijangkau dari backend.
Fallback tidak membuat sumber yang diblokir menjadi dapat diakses; katalog
tersimpanlah yang menjaga daftar dan pencarian tetap tersedia.

## Refresh dan deployment

Proses `npm run dev`/`npm start` melakukan refresh saat startup dan setiap
30 menit. `CATALOG_TTL_SECONDS` default 1800, `DETAIL_TTL_SECONDS` default 3600,
dan `UPSTREAM_TIMEOUT_MS` default 8000 per request. Detail diperbarui saat diakses.
Untuk refresh manual setelah build:

```bat
npm run catalog:refresh
```

`GET /api/cron` memerlukan header `Authorization: Bearer <CRON_SECRET>`.
Tanpa secret terkonfigurasi: 503; secret salah: 401.

Untuk seluruh stack Docker, gunakan `docker compose --env-file .env.local up -d --build`.
Compose ini memakai database/volume terpisah dari `docker-compose.local.yml`,
menjalankan migrasi sebelum API, dan hanya mengekspos port API. Gunakan password
URL-safe (misalnya hex acak) untuk interpolasi URL Compose. Password volume lama
tidak berubah hanya dengan mengganti environment; gunakan kredensial yang sesuai.
`.dockerignore` mengecualikan file environment dan log dari image.

Pada Vercel, sediakan PostgreSQL eksternal, `DATABASE_URL`, `DIRECT_URL`, dan
`CRON_SECRET`; jalankan migrasi dari lingkungan deploy sebelum merilis kode.
`vercel.json` menjadwalkan `/api/cron` sekali sehari. Refresh latar belakang dari
request tidak dijamin selesai pada serverless, sehingga cron eksternal diperlukan.
Sesuaikan batas durasi fungsi dan jumlah halaman seed dengan durasi upstream.

## Migrasi dan database lama

Database baru: `npm run db:migrate`, lalu `npm run db:status`.
Migrasi baseline membuat tabel lama, migrasi berikutnya menambah `CatalogEntry`,
`CatalogSnapshot`, dan indeks pencarian GIN. Tabel film/series lama tetap ada.

Jika database sudah pernah dibuat memakai `prisma db push`, **jangan langsung
menjalankan migrasi baseline**. Cadangkan database, pastikan skema lama cocok
dengan `prisma/migrations/20261124000000_baseline/migration.sql`, lalu tandai
baseline tersebut sebagai sudah diterapkan sebelum menjalankan migrasi katalog:

```bat
node scripts/prisma.cjs migrate resolve --applied 20261124000000_baseline
npm run db:migrate
```

Rollback manual tersedia di `prisma/rollback/catalog.sql`; menghapus katalog dan
snapshot, sehingga memerlukan backup serta penghentian kode yang memakainya.
Rollback tidak dijalankan otomatis dan belum diuji dengan penghapusan tabel.

## Pemeriksaan dan build

```bat
npm run typecheck
npm test -- --runInBand
npm run test:integration
npm run build
npm start
```

Test integrasi memerlukan `TEST_DATABASE_URL` menuju database PostgreSQL khusus
test yang sudah dimigrasi; jangan arahkan ke database produksi. Test hanya
menghapus baris fixture dengan identifier unik yang dibuatnya sendiri. Migrasikan
database test dengan `DATABASE_URL` dan `DIRECT_URL` yang menunjuk database test
di environment proses, lalu jalankan `npm run db:migrate`. Test unit biasa
melewati suite PostgreSQL jika `TEST_DATABASE_URL` tidak tersedia.

`npm start` memakai `dist`; build ulang setelah mengubah source.
`npm run lint` belum dapat digunakan karena dependensi dan konfigurasi ESLint
belum tersedia di proyek ini.
