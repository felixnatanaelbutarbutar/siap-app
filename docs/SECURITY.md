# Security Design & Threat Model — SIAP

## Scope and evidence

Dokumen ini memodelkan risiko keamanan berdasarkan inspeksi kode aktual di `backend/src/`, `infra/`, `web-admin/src/`, dan `mobile/src/`. Penilaian ini bukan uji penetrasi atau sertifikasi keamanan; kontrol yang belum terimplementasi ditandai `Proposed` atau `Unresolved`.

## Assets, actors and trust boundaries

- **Aset Kritis:** Kredensial & hash password `Staff`, token JWT & daftar pencabutan `RevokedToken`, data lokasi GPS historis & real-time, foto bukti ber-watermark & tanda tangan digital + BAST PDF di MinIO, serta kredensial lingkungan (`.env`, `FIREBASE_PRIVATE_KEY`, `JWT_SECRET`, kredensial MinIO & PostgreSQL).
- **Aktor:** Staff Lapangan (`SATPAM`, `CS`, `UTILITY`), Administrator (`ADMIN`), penyerang eksternal tanpa autentikasi, serta pengguna internal berniat jahat / perangkat yang dimodifikasi (fake GPS).
- **Batas Kepercayaan (Trust Boundaries):**
  1. Perangkat Mobile / Browser <-> API Express (`http://localhost:3000` atau Nginx `/api/*`).
  2. API Express <-> PostgreSQL & MinIO S3.
  3. API Express <-> Firebase Cloud Messaging eksternal.

## Threat model

| Ancaman | Jalur Serangan (Evidence) | Kontrol Terobservasi | Status & Risiko Tersisa |
| --- | --- | --- | --- |
| Brute-force login | `POST /auth/login` tanpa batas percobaan | `loginRateLimiter` (`express-rate-limit`, 5 percobaan/IP/10 menit) | **Observed** — pembatasan hanya per IP (distributed/multi-IP attack tidak terbendung oleh bucket IP saja). |
| Penggunaan ulang JWT setelah logout | Klien memakai token lama setelah logout | `auth.controller.ts#L120` menyimpan `jti` ke `revoked_tokens`; `auth.middleware.ts#L84` & `socket.ts` menolak `token_jti` ter-blacklist | **Observed** — `socket.ts` kini fail-closed tanpa fallback secret dan memeriksa `prisma.revokedToken`. |
| Eskalasi hak akses vertikal/horizontal (IDOR) | Staff mengakses endpoint admin atau BAST/laporan milik pihak lain | `requireRole(...)` pada rute admin & laporan; `updateLaporan` cek `staff_id`; `konfirmasiSerahTerima` cek `staff_baru_id`; `getBastUrl` cek `ADMIN` / `staff_lama_id` / `staff_baru_id` | **Observed** — terverifikasi melalui tes integrasi BAST (`403` pihak ketiga, `302` peserta) dan RBAC (`/admin/staff` -> `403`). |
| Bypass validasi upload & DoS memori | Unggah file besar atau non-gambar ke `POST /izin` | `uploadImage` (`upload.middleware.ts`) membatasi 5 MB & MIME `image/*` di semua endpoint upload termasuk `/izin`, dengan mapping HTTP `400` di `errorHandler.ts` | **Observed** — terverifikasi menolak MIME `text/plain` di `POST /izin` dengan status `400`. |
| Manipulasi koordinat GPS (Fake GPS) | Pengiriman koordinat palsu dari perangkat atau API | Server memvalidasi radius (`geolib`) & `akurasi_gps <= 50`; `CameraView.tsx` memeriksa `MockLocationDetector.checkMockLocationProvider()` | **Observed** — pengecekan mock provider berjalan di `CameraView.tsx` dan validasi jarak/akurasi diuji pada `absensi.test.ts`. |
| XSS / SVG Injection pada Watermark | Nama staff/area mengandung karakter `<` atau `&` disisipkan ke `svgOverlay` | `escapeXml()` di `watermark.service.ts` dan penyesuaian dimensi overlay dinamis terhadap dimensi gambar | **Observed** — terverifikasi dengan nama staff bertanda `<...>` dan gambar kecil pada `absensi.test.ts`. |
| CORS terlalu longgar di WebSocket & fallback secret | Koneksi Socket.io dari origin mana pun | `backend/src/index.ts` dan `backend/src/lib/socket.ts` memakai `CORS_ALLOWED_ORIGINS`; `socket.ts` fail-closed jika `JWT_SECRET` kosong & memvalidasi tipe `Number.isFinite` koordinat | **Observed** — konfigurasi origin & token handshake tersinkronisasi antara `socket.ts` dan `dashboard.tsx`. |
| Crash rute `/admin/izin` & kebocoran koneksi DB | Pemanggilan `GET/PUT /admin/izin` saat `NODE_ENV=production` | `izin.controller.ts` & `pengumuman.controller.ts` memakai `prisma` singleton (`backend/src/lib/prisma.ts`); seluruh pemakaian `(global as any).prisma` di `admin.routes.ts` telah dihapus | **Observed** — alur `/izin` & `/admin/izin` teruji end-to-end dengan `NODE_ENV=test` (non-dev singleton). |
| Inkonsistensi Role vs Divisi & Eksposur URL MinIO | Admin membuat staff dengan `role: ADMIN` tapi `divisi: KEAMANAN` atau objek MinIO diakses publik tanpa signed URL | `ROLE_DIVISI_MAP` di `admin.schema.ts` menegakkan pasangan pada `createStaff` & `updateStaff`; `docker-compose.prod.yml` memakai `MINIO_BUCKET=siap-storage` & Nginx proxy `/storage/` | **Observed (Partial Risiko)** — URL file MinIO tetap menggunakan kebijakan baca langsung via `/storage/`/`MINIO_PUBLIC_URL`; pertimbangkan presigned URL apabila BAST memerlukan privasi tautan penuh. |

## Identity and authorization

- **Otorisasi Deterministik di Server:** Seluruh keputusan akses API dilakukan oleh `authenticate` + `requireRole` + pengecekan kepemilikan objek (`getBastUrl`, `updateLaporan`, `konfirmasiSerahTerima`) di `backend/src/`.
- **Kontrol Terverifikasi (M1):**
  1. `GET /serah-terima/:id/bast` mengembalikan `403` bagi staff di luar `staff_lama_id`, `staff_baru_id`, atau `ADMIN`.
  2. `backend/src/lib/socket.ts` menolak handshake tanpa JWT valid/belum dicabut (`revokedToken`).
  3. `admin.schema.ts` dan `admin.controller.ts` menolak pasangan `role` <-> `divisi` invalid pada `POST/PUT /admin/staff`.

## Bots, abuse, and resource limits

- **Rate Limiting:** Diterapkan pada `POST /auth/login` (`5` attempt per IP per `10` menit pada non-test env). Belum ada rate limiter per akun (NIK) maupun throttle khusus pada endpoint pemrosesan gambar (`sharp`) / PDF (`pdfkit`).
- **Batas Ukuran Payload:** JSON & URL-encoded dibatasi `10mb` (`index.ts#L40-L41`); `uploadImage` membatasi seluruh rute unggah (`absensi`, `laporan`, `profil`, `izin`) maksimal `5MB` dan MIME `image/*`.

## Agentic AI and tool safeguards

**Not applicable — aplikasi SIAP tidak menjalankan agent AI, LLM, atau eksekusi tool berbasis model saat runtime (`features.ai = false`).** (Bagian ini hadir sesuai kontrak 21-dokumen untuk memastikan tidak ada permukaan agentic tersembunyi.)

## Data, secrets and operations

- **Higiene Rahasia:** `.gitignore` mengecualikan `.env`, `.env.test`, dan `firebase-service-account.json`; template uji aman tersedia di `backend/.env.test.example` dengan nilai sintetis. **Peringatan:** Pada `infra/docker-compose.yml`, password dev default (`siap_user`, `MINIO_ROOT_PASSWORD`) hanya untuk lingkungan lokal; di produksi wajib diganti melalui environment/secret manager server.
- **Keamanan HTTP:** `helmet()` aktif di `backend/src/index.ts#L33`, dan header keamanan dasar (`X-Frame-Options`, `X-Content-Type-Options`, CSP) terpasang di `infra/nginx/conf.d/default.conf`; HTTPS/TLS pada Nginx masih berupa blok templat siap-aktifkan oleh operator VPS.
- **Logging:** `morgan('combined')` dan `winston` mencatat request dan error ke `backend/logs/`.

## Verification and incident response

- **Verifikasi Keamanan Otomatis (Observed):** Terverifikasi melalui `cd backend ; npm test -- --runInBand` (`4` suite, `16` tes lulus): token revocation (`401 TOKEN_REVOKED`), RBAC (`403` role non-admin), anti-IDOR BAST (`403` bystander vs `302` peserta), penolakan MIME non-gambar (`400`), validasi pairing `role-divisi` (`400`), dan SVG watermark dengan karakter `<...>`.
- **Pemeriksaan Belum Dijalankan:** Uji penetrasi eksternal & audit keamanan perangkat seluler berstatus **Not run** pada sesi ini.
- **Prosedur Insiden (Observed + Proposed):**
  - Rotasi kunci FCM terdokumentasi di `README.md`.
  - Pemulihan database terdokumentasi di `README.md`.
  - **Proposed — approval required:** Tetapkan jadwal rotasi berkala `JWT_SECRET` serta kredensial PostgreSQL/MinIO produksi dan aktifkan TLS Let's Encrypt pada `infra/nginx/conf.d/default.conf`.

## Open risks and response

1. **Sedang (Operasional Produksi):** TLS/HTTPS Nginx belum diaktifkan dan URL objek MinIO memakai akses baca langsung publik (`/storage/`).
2. **Rendah/Operasional:** Rate limiter login berbasis IP (belum per-NIK) dan `CSP` di Nginx masih mengizinkan `'unsafe-inline' 'unsafe-eval'`.
