# Audit Report — SIAP

## Audit status

- **Status Dokumentasi (`validate_docs`):** `PASS` (`21/21` dokumen kanonik hadir, skor `100/100`, `0` error, `0` warning mekanis).
- **Status Kesiapan Implementasi Kode (Pasca M1–M4):** Seluruh perbaikan lintas-layer **M1–M4** pada `backend/`, `web-admin/`, `mobile/`, `infra/`, dan `backend/tests/` **telah diselesaikan dan diverifikasi secara otomatis**; audit kesiapan rilis VPS masih menandai item lingkungan produksi/emulator yang secara jujur belum dijalankan di host lokal ini (`NFR-005` uji beban, aktivasi TLS sertifikat Nginx, serta uji interaktif emulator Android).
- **Stempel Waktu Snapshot & Audit Ulang (UTC):** `2026-11-12T14:53:00Z` (snapshot diperbarui via `snapshot --project . --write --force`).

## Checks and evidence

Seluruh pemeriksaan berikut dijalankan langsung terhadap repositori `c:\my-project\siap-app`:

| Perintah Eksekusi | Hasil | Ringkasan Bukti Terobservasi |
| --- | --- | --- |
| `cd backend ; npx tsc --noEmit ; npm run lint ; npm run build` | `PASS` (`exit 0`) | `0` error TypeScript, `0` error ESLint (`35` warnings non-blocking), `tsc` build ke `dist/` sukses. |
| `cd backend ; npm test -- --runInBand` | `PASS` (`exit 0`) | **`Test Suites: 4 passed, 4 total; Tests: 16 passed, 16 total`** (`auth.test.ts`, `absensi.test.ts`, `laporan.test.ts`, `workflow-admin.test.ts`) terhadap `siap_test_db`. |
| `cd web-admin ; npm run lint ; npm run build` | `PASS` (`exit 0`) | ESLint `--max-warnings 0` (`0` errors, `0` warnings) & `tsc && vite build` ke `dist/` sukses. |
| `cd mobile ; npm run lint` | `PASS` (`exit 0`) | ESLint `0` errors (`193` warnings gaya); pemeriksaan `tsc --noEmit` bebas error non-`TS2786` (`@types/react` vs `react-native-paper`). |
| `python .agents/skills/architect-docs-engine/scripts/cli.py validate-skill` | `PASS` (`exit 0`) | `Skill validation: PASS; 0 finding(s).` |
| `python .agents/skills/architect-docs-engine/scripts/cli.py validate-config --project . --json` | `PASS` (`exit 0`) | `Config validation: PASS; 0 finding(s).` pada `architect-docs.config.json`. |
| `python .agents/skills/architect-docs-engine/scripts/cli.py snapshot --project . --write --force` | `PASS` (`exit 0`) | `165` hashed source/config files dan `112` un-hashed sensitive-excluded paths tersimpan di `.architect-docs/source-snapshot.json`. |
| `python .agents/skills/architect-docs-engine/scripts/cli.py traceability --project . --json` | `PASS` (`exit 0`) | `108` defined IDs, `108` referenced, `108` covered, `0` dangling, `0` duplicate, `0` orphaned. |
| `cd mobile && npm run android` / uji beban `NFR-005` | **Not run** | Tidak ada emulator Android aktif di host Windows & belum dilakukan load testing di lingkungan staging VPS. |

## Findings

### Perbaikan Teknis yang Telah Diverifikasi (`Observed`, M1–M4)
1. **Backend Kritis & Keamanan (M1):** `(global as any).prisma` dihapus seluruhnya; handler izin dipindah ke `izin.controller.ts` memakai `prisma` singleton; Zod + `uploadImage` + penanganan error `400` aktif di `/izin`, `/admin/jadwal`, `/pengumuman`, dan pairing `ROLE_DIVISI_MAP` di `/admin/staff`; `downloadFile` mengunduh `ttd_lama_url` pada BAST & `getBastUrl` menegakkan cek kepemilikan (`403` bystander); `escapeXml` + dimensi SVG adaptif di `watermark.service.ts`; `socket.ts` pakai `CORS_ALLOWED_ORIGINS`, fail-closed `JWT_SECRET`, `revokedToken`, dan validasi angka finite.
2. **Web Admin (M2):** `dashboard.tsx` mengirim JWT handshake Socket.io dan mendengarkan event backend aktual (`location:snapshot`, `location:updated`, `absensi:new`, `laporan:new`, `serah_terima:new`); `absensi.tsx` menghapus `Math.random()` dan memakai `res.chart` agregasi nyata + hitung durasi kerja menit; `api.ts` memakai `VITE_API_URL`/`VITE_SOCKET_URL`; `AdminLayout.tsx` responsif mobile + `NotFoundPage.tsx`.
3. **Mobile App (M3):** `AbsensiScreen.tsx` & `NetworkManager.tsx` & `database.ts` (`markAbsensiFailed`) diselaraskan dengan `/absensi/masuk|keluar|mulai-istirahat|selesai-istirahat`; `SerahTerimaScreen.tsx` & `KonfirmasiSerahTerimaScreen.tsx` terhubung ke API `/serah-terima/mulai` & `/konfirmasi`; `mobile/App.tsx` diselaraskan ke `#006e2f` / `#f3fcef`.
4. **Tests, Infra & Kebersihan Repo (M4):** Suite Jest backend terbarukan lulus `4/4` suite (`16/16` tests) terhadap `siap_test_db` dengan `.env.test.example` sintetis; `infra/docker-compose.prod.yml` (`MINIO_BUCKET=siap-storage`, `MINIO_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`) & `infra/nginx/conf.d/default.conf` (`/socket.io/`, `/storage/`) tersinkron; `temp-admin/` & `temp_mobile/` dihapus.

## Remediation

Tindak lanjut non-blokir kode yang tersisa sebelum go-live produksi publik (**Proposed — approval required** / operasional VPS):
1. Jalankan uji interaktif layar mobile (`UI-010..UI-016` & **TC-007**) pada emulator/perangkat Android fisik.
2. Tetapkan baseline konkurensi & latensi API (`NFR-005`) melalui uji beban di lingkungan staging.
3. Aktifkan blok HTTPS/TLS (`443`) pada `infra/nginx/conf.d/default.conf` dan tetapkan penanggung jawab rotasi rahasia (`JWT_SECRET`, DB, MinIO, FCM) di VPS produksi.
