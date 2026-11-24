# Cine frontend

Frontend React + Vite untuk API katalog LK21. Jalankan PostgreSQL dan backend
terlebih dahulu, lalu di terminal CMD lain:

```bat
cd /d D:\Nuansauai\api\lk21\frontend
npm ci
npm run dev
```

Buka http://localhost:5173. Vite meneruskan `/api` ke backend lokal pada port
3000. `VITE_API_BASE_URL` hanya untuk alamat API publik; jangan simpan rahasia
dalam variabel `VITE_` karena nilainya disertakan dalam kode browser.

```bat
npm run lint
npm run build
npm run preview
```

Player eksternal baru dimuat ketika tombol putar ditekan. Pemuatan iframe dapat
ditolak penyedia atau jaringan; tautan “Buka player” tersedia sebagai alternatif.
Untuk P2P, aplikasi mencoba membuat sesi HLS melalui backend. Kontrol video
muncul setelah tombol persiapan ditekan. Ini eksperimental: source atau URL
segmen dapat berubah atau kedaluwarsa. Sesi disimpan
di memori proses backend maksimal empat jam, hilang saat restart, dan maksimal
100 sesi per proses. Backend meneruskan data video sehingga memakai bandwidth
dan pemakaian memori server; batasi akses serta siapkan rate limiting dan batas
bandwidth sebelum dipublikasikan. Deployment serverless atau banyak instance
memerlukan penyimpanan sesi bersama dan belum didukung oleh implementasi ini.

Subtitle otomatis mencari bahasa Indonesia dan Inggris melalui OpenSubtitles
untuk film; series belum didukung karena episode belum teridentifikasi dengan
andal. Developer harus membuat API consumer di https://www.opensubtitles.com/consumers
dan mengatur `OPENSUBTITLES_API_KEY` dalam `.env.local` backend, lalu restart
backend. Jangan menaruh key di frontend. Tanpa key, film tetap dapat diputar dan
player akan menampilkan bahwa subtitle belum dikonfigurasi. OpenSubtitles memiliki
batas unduhan dan ketentuan penggunaan sendiri; tanpa login pengguna, kuota dan
akses bergantung pada konfigurasi aplikasi dan paket penyedia. Subtitle yang
tersedia dapat berbeda dari versi video dan waktunya belum tentu cocok.

Jika ditemukan, player memuat subtitle Indonesia pertama, atau Inggris bila tidak
ada bahasa Indonesia. Pengguna dapat memilih hasil lain atau mematikannya dan
mengubah ukuran, warna, serta posisi melalui `Atur subtitle`. Subtitle yang sudah
menyatu dalam video tidak dapat diubah. Pilihan kualitas menampilkan resolusi
asli jika terdeteksi; sumber saat ini hanya menyediakan satu versi, sehingga
pilihan resolusi lain tidak tersedia.
Bagian “Uji player dengan video contoh” memuat video bunga publik dari MDN hanya
setelah dipilih, untuk menguji kontrol pemutaran. Video ini bukan film terkait dan
memerlukan akses ke `interactive-examples.mdn.mozilla.net`.
Pencarian hanya mencakup judul yang telah tersimpan pada backend. Daftar film,
series dan populer menampilkan bagian yang tersedia di beranda API, bukan
seluruh katalog. Rekomendasi diambil dari bagian rekomendasi umum.

Menu Film Terbuka berisi tiga film pendek Blender berlisensi Creative Commons,
diputar melalui embed Internet Archive. Koleksi ini terpisah dari katalog LK21;
bukan sumber alternatif untuk memutar judul-judul LK21. Bahasa dan subtitle
bergantung pada versi di Internet Archive. Klik sumber dan lisensi untuk atribusi.

Header keamanan di `vite.config.ts` berlaku untuk server development dan
preview Vite saja. Hosting produksi harus mengonfigurasi header yang setara,
SPA fallback ke `index.html`, dan proxy `/api` atau alamat API publik. CSP
dimulai dalam mode report-only dan masih menggunakan izin luas untuk gambar,
API, dan iframe karena sumbernya dinamis; tentukan allowlist dan endpoint
pelaporan yang sesuai sebelum menerapkan kebijakan CSP produksi.
