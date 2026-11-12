# Validation Rules & Domain Invariants — SIAP

## Input inventory

Validasi backend menggunakan **Zod** (`backend/src/schemas/*.ts`), middleware **Multer** (`backend/src/middleware/upload.middleware.ts`), serta pemeriksaan aturan bisnis di controller (`geolib`, enum divisi, status shift).

| Domain | Skema / Sumber | Status Validasi |
| --- | --- | --- |
| Autentikasi & FCM | `backend/src/schemas/auth.schema.ts` | Observed (Lengkap) |
| Absensi & Riwayat | `backend/src/schemas/absensi.schema.ts`, `absensi.controller.ts` | Observed (Lengkap) |
| Laporan Harian & Per Jam | `backend/src/schemas/laporan.schema.ts`, `laporan.controller.ts` | Observed (Lengkap) |
| Serah Terima | `backend/src/schemas/serah-terima.schema.ts`, `serahterima.controller.ts` | Observed (Lengkap — `ttd_lama` diunduh dari MinIO via `downloadFile`) |
| Admin Staff, Area, Broadcast | `backend/src/schemas/admin.schema.ts` | Observed (Lengkap — pasangan `ROLE_DIVISI_MAP` ditegakkan pada `createStaff` & `updateStaff`) |
| Izin/Cuti, Jadwal Kerja, Pengaturan, Pengumuman | `backend/src/schemas/izin.schema.ts`, `jadwal.schema.ts`, `pengumuman.schema.ts`, `upload.middleware.ts` | Observed (Lengkap — Zod validation & `uploadImage` 5 MB gambar diterapkan) |

## Validation rules

1. **Login & FCM (`auth.schema.ts`)**:
   - `nik`: string wajib, panjang `1..20` karakter.
   - `password`: string wajib, minimal `6` karakter (dibandingkan dengan `bcrypt.compare` terhadap `password_hash`).
   - `fcm_token`: string wajib, minimal `1` karakter.
   - Staff dengan `aktif === false` ditolak dengan HTTP `403` (`ACCOUNT_INACTIVE`).
2. **Koordinat GPS & Absensi (`absensi.schema.ts`, `absensi.controller.ts`)**:
   - `lat` dan `lng`: wajib, dikonversi ke angka (`z.coerce.number()`).
   - `akurasi_gps`: opsional; jika bernilai `> 50` meter, ditolak dengan `GPS_VALIDATION_FAILED`.
   - Jarak geodesic (`geolib.getDistance`) dari `staff.area_tugas` wajib `<= area_tugas.radius_meter`.
   - Invarian shift harian: tidak boleh `MASUK` dua kali pada hari kalender yang sama; tidak boleh `KELUAR` atau istirahat sebelum `MASUK`; tidak boleh `MULAI_ISTIRAHAT` saat sudah istirahat atau `SELESAI_ISTIRAHAT` saat tidak istirahat.
3. **Laporan Harian & Per Jam (`laporan.schema.ts`, `laporan.controller.ts`)**:
   - `judul`: string minimal `5` karakter; `deskripsi`: minimal `10` karakter.
   - `kategori`: harus termasuk dalam `kategoriPerDivisi[user.divisi]` (`KEAMANAN`: `PATROLI | PENJAGAAN | PENGAWALAN | INSIDEN | PEMELIHARAAN`; `CUSTOMER_SERVICE`: `KOMPLAIN | INFORMASI | PENGADUAN | LAIN_LAIN`; `UTILITY`: `KEBERSIHAN | KERUSAKAN | PERBAIKAN | PEMERIKSAAN_RUTIN`).
   - `PUT /laporan/:id` hanya mengizinkan pemilik laporan (`existing.staff_id === user.id`) dan hanya saat `status === 'DRAFT'`.
   - `POST /laporan/perjam` hanya untuk role `SATPAM` yang sedang shift aktif, `jam` dalam rentang `0..23`, foto wajib, dan unik per `(staff_id, tanggal, jam)`.
4. **Serah Terima (`serah-terima.schema.ts`, `serahterima.controller.ts`)**:
   - `barang_list`: array minimal 1 item `{ nama: min(1), kondisi: 'BAIK' | 'RUSAK' | 'HILANG', catatan? }`.
   - `PIKET` hanya boleh dimulai dan diterima oleh `SATPAM`; `PERALATAN` hanya oleh `UTILITY`.
   - Konfirmasi hanya boleh dilakukan oleh `staff_baru_id` yang tercatat dan saat status masih `PENDING`.
5. **Upload Gambar (`upload.middleware.ts`)**:
   - `uploadImage`: batas ukuran `5 MB`, hanya menerima `file.mimetype.startsWith('image/')`.
   - Laporan harian maksimal 5 foto di backend (`uploadImage.array('foto', 5)`), sedangkan di mobile `BuatLaporanScreen.tsx` dibatasi maksimal 3 foto sesuai `TASKS_SIAP.md`.

## Errors and accessibility

- **Format Error Backend (`errorHandler.ts` & controllers)**: Menggunakan JSON `{ success: false, message, code }` dengan pesan berbahasa Indonesia yang jelas untuk pengguna, termasuk pemetaan Prisma `P2002` (409 Duplikat), `P2025` (404 Tidak ditemukan), `MulterError` (`400 LIMIT_FILE_SIZE`), dan file filter gambar (`400 INVALID_FILE_TYPE`).
- **Validasi Rute Izin, Jadwal, & Pengumuman:** Seluruh endpoint `izin`, `jadwal`, `pengaturan-sistem`, dan `pengumuman` kini divalidasi oleh Zod (`izin.schema.ts`, `jadwal.schema.ts`, `pengumuman.schema.ts`) sebelum menyentuh Prisma, sehingga payload invalid mengembalikan `400`.
- **Aksesibilitas Error UI**: Pada `web-admin/src/routes/login.tsx`, pesan error ditampilkan di banner dengan ikon `AlertCircle`; pada layar form modal/halaman admin lainnya, sebagian notifikasi kesalahan memakai `window.dispatchEvent(new CustomEvent('toast', ...))` atau `alert()`, belum seluruhnya terikat via `aria-describedby` atau `aria-live="assertive"`.

## Not applicable or unresolved

- **Catatan Pengerasan Minor (Opsional):** `mulaiSerahTerimaSchema` dan `konfirmasiSerahTerimaSchema` memvalidasi `ttd_lama`/`ttd_baru` sebagai string base64 yang diproses aman pada controller (`Buffer.from`), dan dapat ditambah pengecekan magic-bytes PNG di iterasi lanjutan bila diperlukan.
- **Not applicable — Aturan Invarian LLM/Prompt**: Aplikasi tidak memiliki input atau output model AI runtime (`features.ai = false`).

