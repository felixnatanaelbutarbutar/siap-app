# Test Strategy & Test Cases — SIAP

## Evidence and commands

Status pengujian otomatis & statis saat ini (**Observed & Executed** pada sesi penyelesaian M1–M4):
- **Backend (`cd backend`):**
  - `npx tsc --noEmit`: **Observed PASS** (exit `0`, `0` TypeScript errors).
  - `npm run lint`: **Observed PASS** (exit `0`, `0` errors, `35` warnings).
  - `npm run build` (`tsc`): **Observed PASS** (exit `0`).
  - `npm test -- --runInBand`: **Observed PASS** — `Test Suites: 4 passed, 4 total`; `Tests: 16 passed, 16 total` (`auth.test.ts`, `absensi.test.ts`, `laporan.test.ts`, `workflow-admin.test.ts`) terhadap database uji terisolasi `siap_test_db` (`backend/.env.test`) dengan mock in-memory S3/MinIO + FCM di `backend/tests/setup.ts`.
- **Web Admin (`cd web-admin`):**
  - `npm run lint` (`--max-warnings 0`): **Observed PASS** (exit `0`, `0` errors, `0` warnings).
  - `npm run build` (`tsc && vite build`): **Observed PASS** (exit `0`, `dist/` terbangun bersih).
- **Mobile (`cd mobile`):**
  - `npm run lint`: **Observed PASS** (exit `0`, `0` errors, `193` warnings gaya/indentasi non-blocking).
  - `npx tsc --noEmit`: menemukan error `TS2786` berulang pada JSX akibat ketidakcocokan bawaan `@types/react` hoisted vs `react-native-paper@5.15.3`, namun **`0` error aplikasi non-`TS2786`**.
  - `npm test` / `npm run android`: **Not run** pada sesi ini karena tidak ada emulator Android aktif di host Windows.

## Test cases

| ID | Judul Uji | Prakondisi & Aksi | Ekspektasi Hasil | Status (Observed Evidence) |
| --- | --- | --- | --- | --- |
| **TC-001** | Login sukses, gagal & akun nonaktif | Akun `SATPAM` aktif & nonaktif di `siap_test_db`; kirim `POST /auth/login` | Valid -> `200` + JWT ber-`jti`; password salah -> `401`; nonaktif -> `403 ACCOUNT_INACTIVE` | **Observed PASS** (`auth.test.ts`, 3 tests) |
| **TC-002** | Blacklist token saat logout | Token JWT valid; panggil `POST /auth/logout` lalu `GET /auth/me` | Logout `200`; `RevokedToken` terisi `token_jti`; request ulang -> `401 TOKEN_REVOKED` | **Observed PASS** (`auth.test.ts`) |
| **TC-003** | Otorisasi role RBAC & rate limiting | Panggil `/admin/staff` dengan token `SATPAM`; rate limiter terkonfigurasi di `auth.routes.ts` | Akses non-admin return `403 FORBIDDEN` (rate limiter non-test dikonfigurasi via `express-rate-limit`) | **Observed PASS (RBAC)** (`auth.test.ts`; beban multi-request rate limit di-bypass saat `NODE_ENV=test`) |
| **TC-004** | Absensi masuk dalam radius, watermark & upload | Kirim multipart JPEG `120x120` + koordinat dalam radius (`akurasi_gps: 8`) | Return `200`, watermark SVG adaptif diterapkan tanpa crash, objek tersimpan di store | **Observed PASS** (`absensi.test.ts`) |
| **TC-005** | Penolakan foto kosong, GPS luar radius & akurasi > 50 m | Kirim `/absensi/masuk` tanpa foto, akurasi `75`, atau koordinat luar radius | Ketiganya ditolak `400` (`GPS_VALIDATION_FAILED` + pesan jarak/akurasi) | **Observed PASS** (`absensi.test.ts`, 3 tests) |
| **TC-006** | Siklus lengkap masuk-istirahat-keluar & duplikasi | Jalankan `MASUK` -> `MASUK` (duplikat) -> `MULAI_ISTIRAHAT` -> `SELESAI_ISTIRAHAT` -> `KELUAR` | Siklus penuh sukses `200`; duplikat `MASUK` ditolak `400` | **Observed PASS** (`absensi.test.ts`) |
| **TC-007** | Sinkronisasi offline mobile ke endpoint valid | Inspeksi kode `AbsensiScreen.tsx`, `NetworkManager.tsx`, & `database.ts` + ESLint | `AbsensiScreen` hanya mengantre `!error.response`; `NetworkManager` merutekan `/absensi/*` | **Observed Static & Lint PASS** (runtime offline emulator **Not run**) |
| **TC-008** | Validasi kategori laporan lintas divisi & foto | `CS` kirim kategori `PATROLI` (`KEAMANAN`) dan kategori `KOMPLAIN` + multipart JPEG | Kategori lintas divisi ditolak `400`; `KOMPLAIN` sukses `201` | **Observed PASS** (`laporan.test.ts`, 2 tests) |
| **TC-009** | Laporan per jam khusus SATPAM, wajib shift aktif & unik | `CS` akses `/laporan/perjam`; `SATPAM` kirim sebelum & sesudah `MASUK`, lalu kirim ulang jam sama | `CS` `403`; sebelum shift `400`; saat shift `201`; duplikat jam `400` | **Observed PASS** (`laporan.test.ts`) |
| **TC-010** | Serah terima, konfirmasi, BAST PDF & anti-IDOR | `SATPAM` mulai `PIKET`; penerima konfirmasi; `CS` bystander & `SATPAM` akses `/bast` | `downloadFile` mengunduh `ttd_lama`, status `SELESAI`, `CS` ditolak `403`, peserta `302` | **Observed PASS** (`workflow-admin.test.ts`) |
| **TC-011** | Pengajuan & persetujuan Izin/Cuti tanpa global.prisma | Kirim file `.txt` ke `/izin`; kirim izin valid -> `GET /admin/izin` -> `PUT /admin/izin/:id` | MIME non-gambar ditolak `400`; alur create/list/approve sukses `201`/`200` | **Observed PASS** (`workflow-admin.test.ts`) |
| **TC-012** | Socket.io live tracking & autentikasi handshake | Verifikasi kode `socket.ts` + `dashboard.tsx` + build Vite/TS & inspeksi runtime dev | Handshake JWT & nama event seragam kompilasi bersih (uji stress WS skala besar **Not run**) | **Observed Build & Static PASS** |
| **TC-013** | Dashboard summary, chart bulanan nyata & Export CSV | `GET /admin/statistik/kehadiran` di `workflow-admin.test.ts` + build `absensi.tsx` | Respons `200` memuat array `data` & `chart` agregasi harian nyata tanpa `Math.random()` | **Observed PASS** (`workflow-admin.test.ts` + `web-admin` build) |
| **TC-014** | Master data Staff (pair check), Jadwal & Pengumuman | `POST /admin/staff` (invalid pair vs valid pair), `POST /admin/jadwal`, `POST /pengumuman` | Pasangan `SATPAM`+`UTILITY` ditolak `400`; pasangan valid, jadwal, & pengumuman sukses `201` | **Observed PASS** (`workflow-admin.test.ts`) |
| **TC-015** | Push Notification & Cron Reminder 3 Jam | Mock `notification.service.ts` saat create laporan & review izin + inspeksi cron 3-jam | Pemanggilan notifikasi tidak menyebabkan error controller (uji cron live scheduler **Not run**) | **Observed PASS (Mocked)** |
| **TC-016** | Validasi keamanan MIME, XSS SVG watermark & CORS | Nama staff `<Absensi>` di SVG watermark + MIME `.txt` ke `/izin` + konfigurasi `CORS_ALLOWED_ORIGINS` | Karakter XML di-escape & foto `120x120` berhasil di-watermark `200`; non-image `400` | **Observed PASS** (`absensi.test.ts` & `workflow-admin.test.ts`) |

## Coverage and nonfunctional checks

- **Cakupan Fungsional Terobservasi:** Seluruh `4` file tes integrasi (`16` skenario kasus uji end-to-end HTTP Supertest + PostgreSQL uji `siap_test_db` + Sharp/PDFKit nyata) berjalan deterministik tanpa `--forceExit`. (`jest --coverage` tidak dijadikan ambang batas persentase di repo.)
- **Uji Non-Fungsional (Performa & Penetrasi):** Pengukuran beban konkurensi API (`NFR-005`) dan uji penetrasi keamanan infrastruktur VPS berstatus **Not run**.

## Not run

Daftar pemeriksaan yang jujur belum dijalankan pada sesi ini beserta alasannya:
- `cd mobile && npm run android` / uji interaktif emulator Android — **Not run**: tidak ada perangkat/emulator Android aktif terhubung ke host Windows selama sesi penyelesaian.
- Peninjauan visual terender multi-browser & audit keyboard WCAG interaktif (`UI.md`/`UX.md`) — **Not run**: verifikasi UI baru mencakup kompilasi TypeScript, lint (`--max-warnings 0`), bundling Vite produksi, dan HTTP `200` dev server.
- Benchmark beban `NFR-005` & verifikasi sertifikat TLS produksi pada VPS — **Not run**.

