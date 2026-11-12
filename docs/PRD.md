# PRD — SIAP (Sistem Absensi & Pelaporan)

## Problem and evidence

Organisasi pengelola gedung membutuhkan pencatatan kehadiran lapangan, pelaporan harian lintas divisi, kontrol patroli berkala, serah terima shift/inventaris, serta pemantauan admin secara terpusat. Berdasarkan inspeksi terhadap `README.md`, `ARCHITECTURE_SIAP.md`, `TASKS_SIAP.md`, serta kode sumber pada `backend/`, `web-admin/`, dan `mobile/`, sistem SIAP sudah memiliki implementasi fungsional inti, namun masih ditemukan celah ketidaksinkronan antar-layer, bug runtime pada rute tertentu, test suite backend yang tidak sinkron dengan skema Prisma, serta konflik konfigurasi produksi (`infra/docker-compose.prod.yml` dan `web-admin/src/services/api.ts`).

## Users and constraints

| Aktor / Role | Platform | Tanggung Jawab (Observed) | Sumber Bukti |
| --- | --- | --- | --- |
| `SATPAM` (Divisi `KEAMANAN`) | Mobile (`mobile/`) | Absensi GPS+foto, laporan harian keamanan, laporan rutin per jam, serah terima `PIKET`, pengajuan izin/cuti | `backend/prisma/schema.prisma`, `mobile/src/navigation/AppNavigator.tsx` |
| `CS` (Divisi `CUSTOMER_SERVICE`) | Mobile (`mobile/`) | Absensi GPS+foto, laporan harian pelayanan, pengajuan izin/cuti | `backend/prisma/schema.prisma`, `mobile/src/navigation/AppNavigator.tsx` |
| `UTILITY` (Divisi `UTILITY`) | Mobile (`mobile/`) | Absensi GPS+foto, laporan harian pemeliharaan/kerusakan, serah terima `PERALATAN`, pengajuan izin/cuti | `backend/prisma/schema.prisma`, `mobile/src/navigation/AppNavigator.tsx` |
| `ADMIN` (Divisi `MANAJEMEN`) | Web Admin (`web-admin/`) | Monitoring dashboard & live tracking, audit absensi & ekspor CSV, review laporan & izin, manajemen staff, area tugas, jadwal, pengumuman | `backend/src/routes/admin.routes.ts`, `web-admin/src/components/layout/AdminLayout.tsx` |

Batasan proyek (User-specified & Observed):
- Infrastruktur lokal berjalan melalui Docker (`infra/docker-compose.yml`) dengan PostgreSQL 16 (`5432`) dan MinIO (`9000`/`9001`).
- Aplikasi tidak menggunakan LLM/AI runtime (`features.ai = false` pada `architect-docs.config.json`).
- Akses kontrol wajib dilakukan di server melalui middleware `authenticate` dan `requireRole` (`backend/src/middleware/`).

## Scope

**Dalam Cakupan (Observed):**
- Autentikasi berbasis NIK & kata sandi dengan JWT 12 jam, blacklist JTI (`RevokedToken`), manajemen profil foto, dan pendaftaran token FCM.
- Absensi masuk, mulai istirahat, selesai istirahat, dan keluar dengan validasi radius GPS (`geolib`), watermark foto (`sharp`), dan penyimpanan objek MinIO.
- Pelaporan harian per divisi (`KEAMANAN`, `CUSTOMER_SERVICE`, `UTILITY`) beserta review `APPROVED`/`REJECTED` oleh admin, serta laporan per jam khusus `SATPAM`.
- Serah terima `PIKET` dan `PERALATAN` beserta tanda tangan digital dan pembuatan dokumen BAST PDF (`pdfkit`).
- Pengajuan & persetujuan izin/cuti, jadwal kerja mingguan & rekap keterlambatan, pengaturan toleransi keterlambatan, dan pengumuman.
- Pelacakan lokasi real-time via Socket.io dan notifikasi push/terjadwal via Firebase Admin SDK dan `node-cron`.

**Di Luar Cakupan / Sisa Pembersihan:**
- Direktori scaffold sisa (`temp-admin/`, `temp_mobile/`) telah dihapus pada Milestone M4 setelah diverifikasi tidak memiliki referensi kode aktif.

## Functional requirements

**REQ-001** — **Observed**: Sistem wajib mengautentikasi staff menggunakan NIK dan password ter-hash (`bcryptjs`), menerbitkan JWT berdurasi 12 jam dengan klaim `jti`, memeriksa status `aktif`, dan membatalkan token saat logout via tabel `revoked_tokens`. Bukti: `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.middleware.ts`.

**REQ-002** — **Observed**: Sistem wajib menegakkan pemisahan akses berbasis role (`SATPAM`, `CS`, `UTILITY`, `ADMIN`) pada endpoint API dan menampilkan menu navigasi sesuai role pada aplikasi mobile dan web admin. Bukti: `backend/src/middleware/role.middleware.ts`, `mobile/src/navigation/AppNavigator.tsx`, `web-admin/src/routes/login.tsx`.

**REQ-003** — **Observed**: Staff lapangan (`SATPAM`, `CS`, `UTILITY`) wajib dapat melakukan absensi `MASUK`, `MULAI_ISTIRAHAT`, `SELESAI_ISTIRAHAT`, dan `KELUAR` dengan validasi koordinat GPS terhadap `AreaTugas` (jarak <= `radius_meter` dan `akurasi_gps <= 50` m) serta pemrosesan watermark pada foto absensi masuk/keluar sebelum diunggah ke MinIO. Bukti: `backend/src/controllers/absensi.controller.ts`, `backend/src/services/watermark.service.ts`.

**REQ-004** — **Observed**: Aplikasi mobile menyimpan absensi yang gagal terkirim karena gangguan jaringan (`!error?.response`) ke SQLite lokal (`op-sqlite`) dan menyinkronkannya otomatis saat jaringan kembali online ke `/absensi/masuk`, `/absensi/keluar`, `/absensi/mulai-istirahat`, atau `/absensi/selesai-istirahat` melalui `NetworkManager.tsx`, serta menandai status gagal agar penolakan `4xx` server tidak memblokir antrean FIFO. Bukti: `mobile/src/components/NetworkManager.tsx`, `mobile/src/screens/main/AbsensiScreen.tsx`, `mobile/src/store/database.ts`.

**REQ-005** — **Observed**: Staff lapangan wajib dapat membuat dan melihat laporan harian dengan kategori yang dibatasi per divisi (`KEAMANAN`, `CUSTOMER_SERVICE`, `UTILITY`), menyunting laporan berstatus `DRAFT`, serta menerima keputusan review (`APPROVED`/`REJECTED`) dan komentar dari `ADMIN`. Bukti: `backend/src/controllers/laporan.controller.ts`, `backend/src/schemas/laporan.schema.ts`.

**REQ-006** — **Observed & Approved**: Staff `SATPAM` wajib dapat mengirim laporan rutin berkala (`LaporanPerJam`) setiap **3 jam** (interval disetujui pemilik proyek) dengan status keamanan (`AMAN`, `ADA_TEMUAN`, `PERLU_PERIKSA`), foto wajib ber-watermark, dan keunikan satu laporan per jam per hari saat shift aktif; backend mengirim pengingat terjadwal setiap kelipatan 3 jam. Bukti: `backend/src/controllers/laporan.controller.ts`, `backend/src/index.ts`, `mobile/src/screens/laporan/LaporanPerJamScreen.tsx`.

**REQ-007** — **Observed**: Staff `SATPAM` (`PIKET`) dan `UTILITY` (`PERALATAN`) dapat memulai serah terima dengan daftar barang dan tanda tangan digital penyerah, lalu staff penerima mengonfirmasi untuk menghasilkan BAST PDF di MinIO (`konfirmasiSerahTerima` mengunduh `ttd_lama_url` dari MinIO via `downloadFile`, dan `getBastUrl` menegakkan pemeriksaan kepemilikan `ADMIN` / `staff_lama_id` / `staff_baru_id`). Bukti: `backend/src/controllers/serahterima.controller.ts`, `backend/src/services/storage.service.ts`.

**REQ-008** — **Observed**: Dashboard admin menampilkan ringkasan kehadiran per divisi, grafik kehadiran 7 hari, daftar aktivitas terbaru, dan peta live tracking lokasi staff via Socket.io dengan handshake JWT (`auth: { token }`) dan event terpadu (`location:snapshot`, `location:updated`, `absensi:new`, `laporan:new`, `serah_terima:new`). Bukti: `web-admin/src/routes/_authenticated/dashboard.tsx`, `backend/src/lib/socket.ts`.

**REQ-009** — **Observed**: Admin meninjau riwayat absensi harian, statistik kehadiran bulanan dengan agregasi tren harian nyata dari `GET /admin/statistik/kehadiran` (`chart`), penghitungan durasi kerja tepat dalam menit dikurangi durasi istirahat, serta mengekspor CSV. Bukti: `web-admin/src/routes/_authenticated/absensi.tsx`, `backend/src/controllers/admin.controller.ts`.

**REQ-010** — **Observed**: Staff lapangan mengajukan izin/cuti/sakit (`uploadImage` 5 MB gambar + Zod `createIzinSchema`) dan admin meninjau melalui `izin.controller.ts` menggunakan `prisma` singleton tervalidasi `reviewIzinSchema`. Bukti: `backend/src/controllers/izin.controller.ts`, `backend/src/routes/izin.routes.ts`, `backend/src/routes/admin.routes.ts`.

**REQ-011** — **Observed**: Admin wajib dapat mengelola master data staff (`GET/POST/PUT/PATCH`), master area tugas (koordinat & radius), jadwal kerja mingguan (`JadwalKerja`), rekap keterlambatan bulanan, pengaturan toleransi keterlambatan, dan pengumuman (`Pengumuman`). Bukti: `backend/src/controllers/admin.controller.ts`, `backend/src/controllers/jadwal.controller.ts`, `backend/src/controllers/pengumuman.controller.ts`.

**REQ-012** — **Observed**: Sistem wajib mendukung pengiriman push notification melalui Firebase Admin SDK untuk laporan baru ke admin, hasil review ke staff, pengingat laporan per 3 jam, dan broadcast manual oleh admin. Bukti: `backend/src/services/notification.service.ts`, `backend/src/controllers/admin.controller.ts`.

## Non-functional requirements

**NFR-001** — **Observed**: Endpoint `POST /auth/login` wajib menerapkan rate limiting berbasis memori (`express-rate-limit`, default 5 percobaan per IP per 10 menit pada lingkungan non-test). Bukti: `backend/src/routes/auth.routes.ts`.

**NFR-002** — **Observed**: Seluruh unggahan foto melalui middleware `uploadImage` (`absensi`, `laporan`, `profil`, `izin`) dibatasi maksimal 5 MB dan hanya menerima MIME `image/*`, serta payload JSON/urlencoded dibatasi maksimal 10 MB. Bukti: `backend/src/middleware/upload.middleware.ts`, `backend/src/routes/izin.routes.ts`, `backend/src/index.ts`.

**NFR-003** — **Observed**: Password pengguna wajib di-hash dengan `bcryptjs` (cost factor 12 pada seed dan admin controller) dan tidak pernah dikembalikan dalam respons API. Bukti: `backend/prisma/seed.ts`, `backend/src/controllers/admin.controller.ts`.

**NFR-004** — **Observed**: Aplikasi backend wajib mencatat log HTTP dan error terstruktur ke file (`logs/combined.log`, `logs/error.log`, `logs/http.log`) menggunakan `winston` dan `morgan`, serta memformat error global secara konsisten (`{ success: false, message, code }`). Bukti: `backend/src/utils/logger.ts`, `backend/src/middleware/errorHandler.ts`.

**NFR-005** — **Unresolved**: Target latensi respons API, SLA ketersediaan, serta batas jumlah pengguna bersamaan belum memiliki pengukuran beban atau baseline terukur di repositori — diperlukan pengujian beban dan penetapan SLO oleh pemilik sistem.

**NFR-006** — **Observed**: Test suite otomatis backend (`backend/tests/*.test.ts`) beserta `backend/.env.test.example` tersedia dan berjalan terisolasi terhadap database uji `siap_test_db` (`4` suite, `16` kasus uji lulus). Bukti: `backend/tests/setup.ts`, `backend/tests/auth.test.ts`, `backend/tests/absensi.test.ts`, `backend/tests/laporan.test.ts`, `backend/tests/workflow-admin.test.ts`.

## Open decisions

- **Approved (Keputusan Pemilik Proyek):**
  - **Sistem Desain Visual:** Web Admin mempertahankan tema gelap `#121212`/`#1ed760` (`DESIGN.md`) dan Mobile mempertahankan tema terang `#f3fcef`/`#006e2f` (`DESIGN_MOBILE.md`); sisa warna `#111111` di `mobile/App.tsx`, teks brutalisme lama di `README.md`, serta `temp-admin/`/`temp_mobile/` telah dibersihkan.
  - **Interval Laporan Satpam:** Ditetapkan **per 3 jam** secara konsisten di cron backend dan alur UI `LaporanPerJamScreen.tsx`.
  - **Kebijakan CORS & MinIO Publik:** `socket.ts` membaca `CORS_ALLOWED_ORIGINS`, `storage.service.ts` mendukung `MINIO_PUBLIC_URL`, dan Nginx produksi mem-proxy `/api/`, `/socket.io/`, serta `/storage/`.
- **Unresolved — Baseline Kinerja `NFR-005` & Aktivasi TLS Produksi**: Uji beban HTTP/WebSocket untuk menetapkan SLO latensi/konkurensi `NFR-005` dan instalasi sertifikat SSL/TLS Nginx produksi (`443`) belum dijalankan di lingkungan staging/VPS.
