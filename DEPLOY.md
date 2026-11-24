# Deploy ke VPS (Docker)

Stack: **web** (Caddy: frontend + HTTPS otomatis + proxy `/api`) → **api** (Express) → **db** (PostgreSQL) + **redis**.
Hanya port 80/443 yang terbuka ke internet.

## 1. Siapkan VPS

- Ubuntu 22.04/24.04, minimal 2 vCPU / 2 GB RAM / 20 GB disk.
- Pilih lokasi **di luar Indonesia** (mis. Singapura). Domain sumber video dan LK21 sering diblokir ISP Indonesia.
- Arahkan DNS domain Anda (record **A**) ke IP VPS, misalnya `cine.example.com → 203.0.113.10`.

Pasang Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # keluar lalu login lagi
```

Buka firewall (jika memakai ufw):

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Ambil kode dan isi konfigurasi

```bash
git clone https://github.com/sakyc/cine.nuansua.xyz.git
cd cine.nuansua.xyz
cp .env.production.example .env
nano .env
```

Isi minimal: `DOMAIN`, `POSTGRES_PASSWORD`, `CRON_SECRET` (buat dengan `openssl rand -hex 32`).
`PLAYBACK_ENABLED=false` menyembunyikan server P2P (yang memakai bandwidth VPS); HYDRAX tetap tersedia.

## 3. Jalankan

```bash
docker compose up -d --build
docker compose ps          # semua service harus "running"/"healthy"
docker compose logs -f api # migrasi database dan refresh katalog pertama
```

Buka `https://DOMAIN-anda`. Sertifikat HTTPS dibuat otomatis oleh Caddy pada akses pertama
(DNS harus sudah mengarah ke VPS dan port 80/443 terbuka).

## 4. Isi katalog pencarian

Cron di dalam API menelusuri 20 halaman daftar setiap 30 menit. Untuk mengisi katalog sekaligus (±1 jam):

```bash
docker compose exec api npm run catalog:crawl -- 2500
```

Alternatif: pindahkan database lokal yang sudah terisi.

```bash
# di komputer lokal
docker exec lk21-catalog-db-1 pg_dump -U lk21 -d lk21 --data-only -t '"CatalogEntry"' -t '"CatalogSnapshot"' > catalog.sql
# salin catalog.sql ke VPS, lalu
docker compose exec -T db psql -U postgres -d lk21 < catalog.sql
```

## 5. Perawatan

| Tugas | Perintah |
|---|---|
| Update kode | `git pull && docker compose up -d --build` |
| Lihat log | `docker compose logs -f api` (atau `web`) |
| Cek kesehatan | `curl https://DOMAIN/api/health` |
| Backup database | `docker compose exec -T db pg_dump -U postgres lk21 > backup-$(date +%F).sql` |
| Refresh katalog manual | `curl -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron` |

Jika LK21 atau situs series pindah domain, ubah `LK21_BASE_URLS` / `DRAMA_BASE_URLS` (dan bila perlu
`UPSTREAM_REDIRECT_HOSTS`) di `.env`, lalu `docker compose up -d`.

## Catatan

- Database, sertifikat HTTPS, dan cache tersimpan di volume Docker (`pgdata`, `caddy_data`, `redisdata`);
  `docker compose down` tidak menghapusnya, `docker compose down -v` menghapusnya.
- Situs yang menayangkan konten tanpa lisensi berisiko diblokir dan menerima laporan hak cipta ke
  penyedia VPS atau domain.
