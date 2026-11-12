# Implementation Plan & Execution Record — SIAP

## Current state

Seluruh milestone perbaikan **M1–M4** menuju penyelesaian implementasi inti SIAP (`backend/`, `web-admin/`, `mobile/`, `infra/`, dan `backend/tests/`) **telah dieksekusi dan diverifikasi**. Ringkasan status aktual terobservasi:

| Komponen | Status Saat Ini (Observed) | Catatan Hasil Eksekusi |
| --- | --- | --- |
| Database & Prisma (`backend/prisma/`) | Selesai (`Observed`) | 10 model, migrasi up-to-date, `seed.ts` kini meng-upsert `PengaturanSistem` (`toleransi_keterlambatan_menit: 15`) dan database uji terpisah `siap_test_db` aktif |
| Backend API & Services (`backend/src/`) | Lulus (`Observed`) | `tsc --noEmit` `0` error, `npm run lint` `0` error, `npm run build` (`tsc`) lulus; `(global as any).prisma` dihapus; `izin`, `jadwal`, `pengumuman`, `admin` memakai singleton `prisma` + Zod + `uploadImage`; `downloadFile` & cek IDOR BAST aktif; `escapeXml` + dimensi dinamis SVG watermark; `socket.ts` pakai `CORS_ALLOWED_ORIGINS`, fail-closed `JWT_SECRET`, `revokedToken`, dan validasi numerik |
| Web Admin (`web-admin/src/`) | Lulus (`Observed`) | `npm run lint` (`--max-warnings 0`) `0` error/warning & `npm run build` (`tsc && vite build`) lulus; `dashboard.tsx` socket ber-JWT & event sinkron; `absensi.tsx` memakai `chart` nyata tanpa `Math.random()`; `api.ts` berbasis `VITE_API_URL`; `AdminLayout.tsx` responsif + `NotFoundPage.tsx`; `app.tsx` sisa dihapus |
| Mobile App (`mobile/src/`) | Diselaraskan (`Observed`) | `npm run lint` `0` error (0 non-`TS2786` TypeScript error di luar ketidakcocokan `@types/react` / `react-native-paper`); `AbsensiScreen.tsx` & `NetworkManager.tsx` & `database.ts` (`markAbsensiFailed`) diselaraskan; `SerahTerimaScreen.tsx` & `KonfirmasiSerahTerimaScreen.tsx` terhubung ke `/serah-terima/mulai` & `/konfirmasi`; `App.tsx` memakai `#006e2f`/`#f3fcef`; **emulator Android belum dijalankan** (`Not run`) |
| Testing & Produksi (`backend/tests/`, `infra/`) | Lulus Backend (`Observed`) | `4/4` suite (`16/16` kasus uji) `npm test -- --runInBand` lulus terhadap `siap_test_db`; `.env.test.example` tersedia; `docker-compose.prod.yml` (`MINIO_BUCKET=siap-storage`, `MINIO_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`) & `nginx/conf.d/default.conf` (`/socket.io/`, `/storage/`) diselaraskan; `temp-admin/` & `temp_mobile/` dihapus |

## Milestones

Keempat milestone di bawah ini berstatus **Approved & Implemented**:

1. **M1 — Perbaikan Backend Kritis & Keamanan (`backend/src/`) — Done & Verified:**
   - Memindahkan handler `/admin/izin` dari `backend/src/routes/admin.routes.ts` ke `backend/src/controllers/izin.controller.ts` menggunakan singleton `prisma` (`backend/src/lib/prisma.ts`) dan menghapus seluruh `(global as any).prisma`.
   - Menambahkan skema Zod (`backend/src/schemas/izin.schema.ts`, `jadwal.schema.ts`, `pengumuman.schema.ts`, serta `ROLE_DIVISI_MAP` pada `admin.schema.ts`), menerapkan `uploadImage` + penanganan `MulterError`/`INVALID_FILE_TYPE` (`400`) di `errorHandler.ts`.
   - Menambahkan `downloadFile` (`GetObjectCommand`) pada `backend/src/services/storage.service.ts` agar `konfirmasiSerahTerima` mengunduh `ttd_lama_url` dari MinIO, dan menambahkan pengecekan otorisasi (`ADMIN`, `staff_lama_id`, `staff_baru_id`) di `getBastUrl`.
   - Menambahkan `escapeXml()` dan penyesuaian dimensi SVG adaptif di `watermark.service.ts`; mengamankan `socket.ts` dengan `CORS_ALLOWED_ORIGINS`, fail-closed `JWT_SECRET`, `revokedToken`, dan validasi numerik finite; menjaga `listen` & `cron.schedule` di `index.ts` agar hanya aktif saat `NODE_ENV !== 'test'`.
   - Memenuhi: **REQ-007**, **REQ-010**, **ADR-005**, **EP-010**, **EP-011**, **EP-016**, **EP-018**.

2. **M2 — Perbaikan Integrasi Web Admin (`web-admin/src/`) — Done & Verified:**
   - Memperbarui `web-admin/src/routes/_authenticated/dashboard.tsx` untuk mengirim `auth: { token }`, berlangganan event resmi backend (`location:snapshot`, `location:updated`, `absensi:new`, `laporan:new`, `serah_terima:new`), dan menggunakan kunci `staff_id || id`.
   - Menghapus `Math.random()` dari `web-admin/src/routes/_authenticated/absensi.tsx` menggunakan `res.chart` dari `GET /admin/statistik/kehadiran`, menghitung durasi kerja dalam menit dikurangi waktu istirahat, dan menambah filter divisi pada tab Bulanan.
   - Mengekspor `API_BASE_URL` dan `SOCKET_URL` berbasis `import.meta.env.VITE_API_URL` / `VITE_SOCKET_URL` di `web-admin/src/services/api.ts`, memperbaiki `AdminLayout.tsx` agar responsif (top-bar mobile + drawer), menambahkan `NotFoundPage.tsx` (`main.tsx`), memperbaiki konfigurasi `.eslintrc.cjs`, menghapus `src/App.tsx` lama, dan memperbarui judul di `web-admin/index.html`.
   - Memenuhi: **REQ-008**, **REQ-009**, **UI-002**, **UI-003**, **FLOW-008**, **FLOW-009**.

3. **M3 — Perbaikan Offline Sync, Kontrak API, & Tema Mobile (`mobile/src/`) — Done (Static & Lint Verified; Emulator Not Run):**
   - Memperbaiki `mobile/src/screens/main/AbsensiScreen.tsx` agar hanya mengantrekan error jaringan (`!error?.response`) ke SQLite, memperbaiki `NetworkManager.tsx` agar merutekan setiap `item.jenis` ke endpoint `/absensi/masuk`, `/keluar`, `/mulai-istirahat`, `/selesai-istirahat`, serta menambah `markAbsensiFailed` di `database.ts`.
   - Menyelaraskan `mobile/src/services/socket.ts` dengan `API_BASE_URL`, menyelaraskan payload `SerahTerimaScreen.tsx` & `KonfirmasiSerahTerimaScreen.tsx` ke `/serah-terima/mulai` & `/serah-terima/:id/konfirmasi`, dan memverifikasi pemanggilan `MockLocationDetector` di `CameraView.tsx`.
   - Menyelaraskan `PaperProvider` theme di `mobile/App.tsx` ke `#006e2f` / `#f3fcef` (**ADR-006**) serta memperbaiki error TS/ESLint di komponen dan layar mobile (`Skeleton.tsx`, `CameraView.tsx`, `auth.store.ts`, layar laporan/login/beranda/serah-terima).
   - Memenuhi: **REQ-003**, **REQ-004**, **UI-012**, **FLOW-002**, **FLOW-003**.

4. **M4 — Perbaikan Test Suite Backend & Pembersihan Konfigurasi Produksi — Done & Verified:**
   - Menulis ulang `backend/tests/setup.ts`, `auth.test.ts`, `absensi.test.ts`, `laporan.test.ts`, dan menambahkan `workflow-admin.test.ts` serta `backend/.env.test.example` untuk menjalankan 16 uji integrasi terisolasi terhadap `siap_test_db` (menghapus `jest.config.json` duplikat).
   - Menyelaraskan `infra/docker-compose.prod.yml` (`MINIO_BUCKET=siap-storage`, `MINIO_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`), `infra/nginx/conf.d/default.conf` (`/socket.io/` & `/storage/`), dan `backend/prisma/seed.ts` (`pengaturanSistem`).
   - Menghapus `temp-admin/` dan `temp_mobile/`, memperbarui `.gitignore` (`.env.test`), serta menyelaraskan `README.md` dengan sistem desain resmi.
   - Memenuhi: **NFR-006**, **TC-001** s.d. **TC-016**, **ADR-006**.

## Verification and rollback

- **Gerbang Verifikasi yang Sudah Dijalankan (Observed Evidence):**
  - Backend: `cd backend ; npx tsc --noEmit` (`0` error), `npm run lint` (`0` error, `35` warning), `npm run build` (exit `0`), `npm test -- --runInBand` (`4 passed suites, 16 passed tests`, exit `0`).
  - Web Admin: `cd web-admin ; npm run lint` (`--max-warnings 0`, exit `0`), `npm run build` (`tsc && vite build`, exit `0`).
  - Mobile: `cd mobile ; npm run lint` (`0` error, `193` warning), `npx tsc --noEmit` (`0` error aplikasi di luar `TS2786` dari `@types/react`/`react-native-paper`).
- **Pemeriksaan Tersisa (Not Run):** Uji interaktif di emulator Android (`cd mobile && npm run android`), pengukuran beban `NFR-005`, dan aktivasi SSL/TLS sertifikat di VPS produksi.
- **Strategi Rollback:** Seluruh perubahan tidak memecahkan riwayat migrasi Prisma existing (`siap_db` tetap utuh, `siap_test_db` terpisah), sehingga rollback dapat dilakukan per commit/berkas melalui git tanpa kehilangan skema DB.

## Open dependencies

- Ketersediaan perangkat/emulator Android apabila operator ingin memverifikasi UI mobile M3 secara interaktif di perangkat fisik/emulator.
- Penetapan target beban `NFR-005` dan instalasi sertifikat HTTPS Nginx sebelum go-live VPS produksi.

