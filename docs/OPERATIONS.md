# Operations & Deployment Runbook — SIAP

## Observed topology

Lingkungan pengembangan lokal terobservasi berjalan melalui `infra/docker-compose.yml` + dev server lokal:
- **PostgreSQL 16 (`siap-postgres`):** `localhost:5432` (database `siap_db`).
- **MinIO (`siap-minio` & `siap-minio-init`):** S3 API `http://localhost:9000`, Web Console `http://localhost:9001`, bucket `siap-storage` dengan kebijakan download publik.
- **Backend (`backend/`):** Express + Socket.io + node-cron di `http://localhost:3000` (health check `GET /health`).
- **Web Admin (`web-admin/`):** Vite dev server di `http://localhost:5173`.
- **Mobile (`mobile/`):** React Native CLI (`npm run android` -> `10.0.2.2:3000` atau `adb reverse tcp:3000 tcp:3000`).

Topologi produksi (`infra/docker-compose.prod.yml` & `infra/nginx/conf.d/default.conf`) menggunakan Nginx pada port `80`/`443` yang merutekan `/api/*` ke `backend:3000/*`, `/socket.io/*` (WebSocket upgrade) ke `backend:3000`, `/storage/*` ke `minio:9000`, dan `/*` ke file statis `web-admin/dist`, dengan `MINIO_BUCKET=siap-storage` dan `MINIO_PUBLIC_URL` terselaraskan di `docker-compose.prod.yml` dan `storage.service.ts`.

## Configuration and startup

Perintah startup yang terverifikasi di lingkungan lokal Windows:
1. Nyalakan infrastruktur Docker:
   ```powershell
   cd infra
   docker compose up -d
   ```
2. Siapkan dan jalankan Backend:
   ```powershell
   cd backend
   npm install
   npm run prisma:generate
   npx prisma migrate status
   npm run dev
   ```
3. Jalankan Web Admin:
   ```powershell
   cd web-admin
   npm install
   npm run dev
   ```
4. Atur variabel lingkungan mengacu pada `backend/.env.example` (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `MINIO_*`, `FIREBASE_*`, `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_*`). Jangan pernah menyalin nilai `.env` nyata ke dokumen atau VCS.

## Deploy and recovery

- **CI/CD Produksi (`.github/workflows/deploy.yml`):** Terpicu saat push ke `main`, menjalankan SSH ke VPS (`NEVACLOUD_HOST`), menarik kode (`git pull origin main`), membangun `web-admin`, lalu menjalankan `docker-compose -f docker-compose.prod.yml up -d --build`. **Catatan:** Workflow ini belum menjalankan `npm test` atau `tsc` sebelum deploy, dan belum menyalakan TLS/SSL pada Nginx.
- **Backup & Restore (`infra/backup.sh`, `README.md`):**
  - `infra/backup.sh` melakukan `pg_dump` dari container `infra-postgres-1` (catatan: di dev container bernama `siap-postgres`, dan di `docker-compose.prod.yml` service bernama `postgres` sehingga nama container bervariasi menurut nama direktori/project Compose).
  - Retensi backup diatur 30 hari di `infra/backups/`.

## Monitoring and incidents

- **Health Check:** `GET http://localhost:3000/health` mengembalikan `{ status: "ok", timestamp, service: "SIAP Backend" }`.
- **Logging (`backend/src/utils/logger.ts`):** Mencatat log ke `backend/logs/combined.log`, `backend/logs/error.log`, dan `backend/logs/http.log` beserta console pada non-produksi.
- **Cron Terjadwal (`backend/src/index.ts`):**
  - `0 0 * * *`: pembersihan `revoked_tokens` kedaluwarsa.
  - `0 * * * *`: pengecekan reminder laporan per 3 jam untuk `SATPAM` yang sedang shift aktif.
- **Penanganan Insiden:** Jika token FCM bermasalah, ganti kredensial Firebase sesuai `README.md#L150-L155` dan restart backend.

## Not applicable or unresolved

- **Observed (Diselesaikan pada M4):** `infra/docker-compose.prod.yml` dan `infra/nginx/conf.d/default.conf` kini menggunakan `MINIO_BUCKET=siap-storage`, `MINIO_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`, serta blok proxy `/socket.io/` dan `/storage/`.
- **Unresolved — TLS/HTTPS & Pemilik Alerting Produksi**: Konfigurasi HTTPS port `443` di `infra/nginx/conf.d/default.conf` menunggu instalasi sertifikat VPS dan penanggung jawab on-call produksi belum ditetapkan.
- **Not applicable — Pemantauan Biaya Token LLM**: Tidak ada pemanggilan API AI berbayar saat runtime (`features.ai = false`).

