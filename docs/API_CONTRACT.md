# API & Realtime Interface Contract — SIAP

## Interface inventory

Backend Express (`backend/src/index.ts`) melayani endpoint REST HTTP (tanpa prefix `/api` saat akses langsung port `3000`; di Nginx produksi dipetakan dari `/api/*` ke `backend:3000/*`) dan server WebSocket Socket.io (`backend/src/lib/socket.ts`).

| ID | Metode / Event | Path / Channel | Otorisasi | Sumber Bukti |
| --- | --- | --- | --- | --- |
| **EP-001** | `GET` | `/health` | Publik | `backend/src/index.ts#L46-L48` |
| **EP-002** | `POST` | `/auth/login` | Publik (Rate limit 5/10m) | `backend/src/routes/auth.routes.ts#L28` |
| **EP-003** | `POST` | `/auth/logout` | `authenticate` | `backend/src/routes/auth.routes.ts#L31` |
| **EP-004** | `POST`, `GET`, `PUT` | `/auth/fcm-token`, `/auth/me`, `/auth/profil/foto` | `authenticate` | `backend/src/routes/auth.routes.ts#L32-L34` |
| **EP-005** | `POST` | `/absensi/masuk`, `/absensi/keluar` | `SATPAM`, `CS`, `UTILITY` | `backend/src/routes/absensi.routes.ts#L24-L25` |
| **EP-006** | `POST` | `/absensi/mulai-istirahat`, `/absensi/selesai-istirahat` | `SATPAM`, `CS`, `UTILITY` | `backend/src/routes/absensi.routes.ts#L26-L27` |
| **EP-007** | `GET` | `/absensi/hari-ini`, `/absensi/jadwal-hari-ini`, `/absensi/riwayat` | `SATPAM`, `CS`, `UTILITY` | `backend/src/routes/absensi.routes.ts#L29-L31` |
| **EP-008** | `POST`, `GET`, `PUT` | `/laporan`, `/laporan/:id` | `SATPAM`, `CS`, `UTILITY` | `backend/src/routes/laporan.routes.ts#L22-L24` |
| **EP-009** | `POST`, `GET` | `/laporan/perjam` | `SATPAM` | `backend/src/routes/laporan.routes.ts#L29-L30` |
| **EP-010** | `POST`, `GET` | `/serah-terima/mulai`, `/serah-terima/:id/konfirmasi`, `/serah-terima/riwayat`, `/serah-terima/:id/bast` | `SATPAM`, `UTILITY` (riwayat & bast hanya `authenticate`) | `backend/src/routes/serahterima.routes.ts#L17-L25` |
| **EP-011** | `POST`, `GET` | `/izin`, `/izin/saya` | `authenticate` | `backend/src/routes/izin.routes.ts#L12-L43` |
| **EP-012** | `GET`, `POST`, `DELETE` | `/pengumuman`, `/pengumuman/:id` | `GET`: `authenticate`; `POST`/`DELETE`: `ADMIN` | `backend/src/routes/pengumuman.routes.ts` |
| **EP-013** | `GET` | `/admin/dashboard/summary`, `/admin/dashboard/chart`, `/admin/dashboard/activities`, `/admin/dashboard/live-tracking` | `ADMIN` | `backend/src/routes/admin.routes.ts#L32-L35` |
| **EP-014** | `GET` | `/admin/statistik/kehadiran`, `/admin/export/absensi`, `/admin/absensi` | `ADMIN` | `backend/src/routes/admin.routes.ts#L36-L42` |
| **EP-015** | `GET`, `PATCH` | `/admin/laporan`, `/admin/laporan/:id/review`, `/admin/laporan-perjam` | `ADMIN` | `backend/src/routes/admin.routes.ts#L45-L49` |
| **EP-016** | `GET`, `PUT` | `/admin/serah-terima`, `/admin/inventaris/bermasalah`, `/admin/izin`, `/admin/izin/:id` | `ADMIN` | `backend/src/routes/admin.routes.ts#L52-L116` |
| **EP-017** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/admin/staff*`, `/admin/area-tugas*`, `/admin/jadwal*`, `/admin/rekap-jadwal`, `/admin/pengaturan-sistem`, `/admin/notifikasi/broadcast` | `ADMIN` | `backend/src/routes/admin.routes.ts#L120-L142` |
| **EP-018** | `WS (Socket.io)` | `location:update`, `location:snapshot`, `location:updated`, `absensi:new`, `laporan:new`, `serah_terima:new` | JWT pada `handshake.auth.token` | `backend/src/lib/socket.ts` |

## Contracts

- **Autentikasi (**EP-002**, **EP-003**, **EP-004**):** `POST /auth/login` menerima `{ nik, password }`, mengembalikan `{ success: true, data: { token, user } }`. Header wajib untuk rute terproteksi adalah `Authorization: Bearer <jwt>`. `POST /auth/logout` memasukkan `jti` ke `revoked_tokens` dan mengosongkan `fcm_token`.
- **Absensi (**EP-005**, **EP-006**, **EP-007**):** `POST /absensi/masuk` dan `/absensi/keluar` menerima `multipart/form-data` (`foto`, `lat`, `lng`, `akurasi_gps?`). `POST /absensi/mulai-istirahat` dan `/selesai-istirahat` menerima JSON `{ lat, lng }`. Klien offline mobile (`mobile/src/components/NetworkManager.tsx`) kini merutekan setiap `item.jenis` langsung ke keempat endpoint resmi tersebut dan menandai penolakan `4xx` melalui `markAbsensiFailed`.
- **Pelaporan (**EP-008**, **EP-009**):** `POST /laporan` menerima `multipart/form-data` (`kategori`, `judul`, `deskripsi`, `foto[]` hingga 5 berkas). `POST /laporan/perjam` menerima `multipart/form-data` (`jam`, `status_keamanan`, `catatan?`, `lat`, `lng`, `foto`).
- **Serah Terima (**EP-010**):** `POST /serah-terima/mulai` menerima JSON `{ jenis, staff_baru_id, barang_list, catatan?, foto_urls?, ttd_lama }`. `POST /serah-terima/:id/konfirmasi` menerima `{ ttd_baru }` dan mengunduh `ttd_lama_url` langsung dari MinIO (`downloadFile`) bila `ttd_lama` tidak dikirim. `GET /serah-terima/:id/bast` memeriksa kepemilikan (`ADMIN` / `staff_lama_id` / `staff_baru_id`) sebelum melakukan `res.redirect(bast_pdf_url)`.
- **Izin & Pengumuman (**EP-011**, **EP-012**):** `POST /izin` memakai `uploadImage.single('foto')` + `createIzinSchema` (`multipart/form-data`: `jenis`, `tanggal_mulai`, `tanggal_selesai`, `keterangan`, `foto?`). `POST /pengumuman` menerima JSON `{ judul, konten, tipe }` tervalidasi `createPengumumanSchema`.
- **Admin (**EP-013** s.d. **EP-017**):** `GET /admin/export/absensi` mengembalikan `text/csv` dengan header `Content-Disposition: attachment`. `/admin/izin` dan `PUT /admin/izin/:id` kini ditangani oleh `izin.controller.ts` memakai `prisma` singleton (`backend/src/lib/prisma.ts`), dan `GET /admin/statistik/kehadiran` mengembalikan `chart` tren harian riil di samping ringkasan per staf.
- **WebSocket (**EP-018**):**
  - Client staff memancarkan `location:update` dengan `{ lat, lng, akurasi }` yang divalidasi numerik finite di server.
  - Server memasukkan socket `ADMIN` ke room `admin` dan memancarkan `location:snapshot` saat koneksi, `location:updated` saat staff mengirim lokasi, serta `absensi:new`, `laporan:new`, `serah_terima:new` saat transaksi terjadi.
  - `web-admin/src/routes/_authenticated/dashboard.tsx` kini mengirim `auth: { token }` dan mendengarkan seluruh nama event resmi tersebut.

## Errors and compatibility

| Kode HTTP | Kode Aplikasi (`code`) | Kondisi | Sumber |
| --- | --- | --- | --- |
| `400` | `VALIDATION_ERROR`, `GPS_VALIDATION_FAILED` | Payload tidak valid, GPS di luar radius, akurasi > 50 m, atau duplikasi aksi shift | `auth.controller.ts`, `absensi.controller.ts`, `errorHandler.ts` |
| `401` | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `TOKEN_REVOKED` | Header Bearer hilang, JWT kedaluwarsa, tidak sah, atau sudah di-logout | `auth.middleware.ts` |
| `403` | `FORBIDDEN`, `ACCOUNT_INACTIVE` | Role tidak sesuai atau akun nonaktif | `role.middleware.ts`, `auth.controller.ts` |
| `404` | `NOT_FOUND`, `PRISMA_P2025` | Rute atau entitas tidak ditemukan | `index.ts`, `errorHandler.ts` |
| `409` | `PRISMA_P2002` | Pelanggaran constraint unik database | `errorHandler.ts` |
| `429` | `RATE_LIMIT_EXCEEDED` | Melebihi 5 percobaan login per IP dalam 10 menit | `auth.routes.ts` |

- **Kompatibilitas Reverse Proxy:** `infra/nginx/conf.d/default.conf` memetakan `/api/` ke `http://backend:3000/`, `/socket.io/` ke WebSocket backend, dan `/storage/` ke MinIO, sedangkan `web-admin/src/services/api.ts` membaca `import.meta.env.VITE_API_URL` & `VITE_SOCKET_URL`.

## Not applicable or unresolved

- **Catatan Peningkatan Opsional (`REQ-004`):** Penambahan kolom `waktu_offline` di model `Absensi` melalui migrasi Prisma terpisah dapat dipertimbangkan di rilis mendatang apabila pencatatan timestamp perangkat saat offline diperlukan terpisah dari `waktu_server`.
- **Not applicable — Kontrak Tool/MCP Eksternal**: Proyek tidak mengekspos server MCP atau tool-calling LLM (`features.ai = false`).

