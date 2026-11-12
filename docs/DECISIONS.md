# Architecture Decision Records — SIAP

## Decision records

### **ADR-001** — Monorepo Tiga Layer (Backend API, Web Admin, Mobile App)
- **Status:** Observed
- **Context:** Operasional lapangan (`SATPAM`, `CS`, `UTILITY`) membutuhkan akses kamera, GPS, tanda tangan, dan offline queue di ponsel, sedangkan pengawasan (`ADMIN`) membutuhkan peta lebar, tabel, dan ekspor CSV di desktop.
- **Options:** (1) Monolith web responsif saja; (2) Monorepo terpisah untuk `backend/`, `web-admin/`, `mobile/`, dan `infra/`.
- **Rationale:** Pemisahan monorepo memungkinkan API tunggal melayani klien mobile native (React Native) dan klien web (Vite/React) secara paralel.
- **Tradeoffs:** Perubahan kontrak API atau enum Prisma harus disinkronkan di 3 folder sekaligus (contoh penyimpangan yang terjadi pada `NetworkManager.tsx` dan `dashboard.tsx`).
- **Evidence:** `backend/package.json`, `web-admin/package.json`, `mobile/package.json`, `infra/docker-compose.yml`.
- **Affected docs:** [README.md](README.md), [TECH_STACK.md](TECH_STACK.md), [API_CONTRACT.md](API_CONTRACT.md).

### **ADR-002** — Autentikasi JWT dengan Daftar Pencabutan Token (`RevokedToken`) di PostgreSQL
- **Status:** Observed
- **Context:** Proyek membutuhkan mekanisme logout yang langsung membatalkan token tanpa menambah infrastruktur Redis (`TASKS_SIAP.md` Task-02).
- **Options:** (1) Stateless JWT tanpa logout server-side; (2) Blacklist JTI di Redis; (3) Blacklist JTI di PostgreSQL (`revoked_tokens`) dengan pembersihan cron harian.
- **Rationale:** Menyimpan `token_jti` di PostgreSQL menjaga infrastruktur tetap sederhana (hanya PostgreSQL + MinIO) sambil tetap memungkinkan pembatalan sesi saat logout.
- **Tradeoffs:** Setiap request terautentikasi melakukan 1 query `findUnique` ke `revoked_tokens`.
- **Evidence:** `backend/src/controllers/auth.controller.ts`, `backend/src/middleware/auth.middleware.ts`, `backend/src/index.ts#L78-L89`.
- **Affected docs:** [DATA_MODEL.md](DATA_MODEL.md), [SECURITY.md](SECURITY.md), [API_CONTRACT.md](API_CONTRACT.md).

### **ADR-003** — Validasi GPS Server-Side dan Watermarking Gambar Sebelum Unggah ke MinIO
- **Status:** Observed
- **Context:** Bukti kehadiran dan laporan lapangan harus dapat dipertanggungjawabkan terhadap lokasi tugas dan waktu server.
- **Options:** (1) Percaya validasi GPS & watermark di sisi mobile; (2) Validasi jarak (`geolib`) dan render SVG watermark (`sharp`) di backend sebelum disimpan ke MinIO.
- **Rationale:** Validasi di server mencegah manipulasi payload koordinat langsung ke API dan menjamin watermark seragam pada semua foto tersimpan.
- **Tradeoffs:** Beban CPU backend meningkat saat memproses resize/composite gambar (`sharp`) dan `createLaporan` menggunakan fallback `lat: 0, lng: 0` karena payload laporan harian tidak mengirim koordinat.
- **Evidence:** `backend/src/controllers/absensi.controller.ts#L15-L28`, `backend/src/services/watermark.service.ts`, `backend/src/services/storage.service.ts`.
- **Affected docs:** [VALIDATION_RULES.md](VALIDATION_RULES.md), [SECURITY.md](SECURITY.md), [API_CONTRACT.md](API_CONTRACT.md).

### **ADR-004** — Pelacakan Lokasi Real-Time In-Memory via Socket.io
- **Status:** Observed (Event Web Admin & Keamanan Handshake Telah Diselaraskan)
- **Context:** Admin perlu memantau posisi staff yang sedang bertugas tanpa membebani database PostgreSQL dengan penulisan koordinat setiap 30 detik.
- **Options:** (1) Polling database berkala; (2) Simpan lokasi terkini di `Map<staff_id, LocationData>` pada memori server dan broadcast ke room `admin`.
- **Rationale:** Memori server menekan I/O database untuk telemetri berfrekuensi 30 detik.
- **Tradeoffs:** Data lokasi hilang saat server restart dan tidak mendukung multi-replica horizontal tanpa adapter eksternal; handshake WebSocket kini wajib JWT valid yang belum dicabut di `revoked_tokens`.
- **Evidence:** `backend/src/lib/socket.ts`, `mobile/src/services/socket.ts`, `web-admin/src/routes/_authenticated/dashboard.tsx`.
- **Affected docs:** [API_CONTRACT.md](API_CONTRACT.md), [IMPLEMENTATION.md](IMPLEMENTATION.md), [OPERATIONS.md](OPERATIONS.md).

### **ADR-005** — Penyeragaman Prisma Singleton, Validasi Input Lengkap, dan Perbaikan Kontrak API/Socket
- **Status:** Approved & Observed (Diimplementasikan di M1–M3)
- **Context:** Sebelumnya ditemukan penggunaan `(global as any).prisma` di `admin.routes.ts`, instance `new PrismaClient()` terpisah di `izin.routes.ts` & `pengumuman.controller.ts`, ketiadaan skema Zod di endpoint izin/jadwal/pengumuman, serta ketidakcocokan kontrak Socket/REST pada `dashboard.tsx` dan `NetworkManager.tsx`.
- **Options:** (1) Menambal di frontend saja; (2) Mengimpor `prisma` singleton dari `backend/src/lib/prisma.ts`, melengkapi skema Zod + middleware `uploadImage`, memperbaiki `ttd_lama` & anti-IDOR BAST, serta menyelaraskan event Socket.io dan endpoint offline sync.
- **Rationale:** Mencegah crash produksi pada `/admin/izin`, mencegah kebocoran koneksi PostgreSQL, dan mengembalikan fungsi real-time dashboard serta offline sync mobile.
- **Tradeoffs:** Membutuhkan pembaruan terkoordinasi di `backend/`, `web-admin/`, dan `mobile/` (seluruhnya telah dieksekusi dan diverifikasi pada M1–M4).
- **Evidence:** `backend/src/controllers/izin.controller.ts`, `backend/src/schemas/izin.schema.ts`, `backend/src/schemas/jadwal.schema.ts`, `backend/src/schemas/pengumuman.schema.ts`, `web-admin/src/routes/_authenticated/dashboard.tsx`, `mobile/src/components/NetworkManager.tsx`.
- **Affected docs:** [IMPLEMENTATION.md](IMPLEMENTATION.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md).

### **ADR-006** — Penyatuan Sistem Desain Web Admin dan Mobile serta Pembersihan Direktori Scaffold
- **Status:** Approved & Observed (Diimplementasikan di M2–M4)
- **Context:** Sebelumnya `README.md`, `DESIGN.md`, `DESIGN_MOBILE.md`, `web-admin/src/index.css`, dan `mobile/App.tsx` memiliki definisi tema yang bertentangan, sementara `temp-admin/` dan `temp_mobile/` masih tersisa di root proyek.
- **Options:** (1) Menulis ulang seluruh UI menjadi Brutalisme Hitam-Putih sesuai `README.md`; (2) Mempertahankan secara resmi tema Spotify Dark/Light (`DESIGN.md` & `index.css`) untuk Web Admin dan tema SIAP Mobility Hijau-Putih (`DESIGN_MOBILE.md` & `#006e2f` / `#f3fcef`) untuk Mobile, menyelaraskan `mobile/App.tsx`, memperbarui `README.md`, dan menghapus `temp-admin/` serta `temp_mobile/`.
- **Rationale:** Sesuai keputusan pemilik proyek untuk mempertahankan kedua tema tanpa regresi AI slop sekaligus menghilangkan inkonsistensi token tema pada `mobile/App.tsx` dan duplikasi scaffold.
- **Tradeoffs:** Tidak ada perubahan alur layar; direktori scaffold historis tidak lagi berada di working tree aktif.
- **Evidence:** `README.md`, `mobile/App.tsx`, `web-admin/src/index.css`, `web-admin/index.html`.
- **Affected docs:** [UI.md](UI.md), [UX.md](UX.md), [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Proposed decisions

Tidak ada usulan keputusan arsitektur baru yang menunggu persetujuan pada penutupan Milestone M1–M4 (seluruh ADR-005 dan ADR-006 telah disetujui dan diimplementasikan; `Unresolved` tersisa hanya pada pengukuran beban produksi `NFR-005`).

## Revisit conditions

- Tinjau ulang **ADR-002** dan **ADR-004** apabila jumlah staff aktif atau replika backend melebihi 1 container (memerlukan Redis adapter untuk Socket.io dan store rate-limiter bersama).
- Tinjau ulang **ADR-003** apabila laporan harian membutuhkan koordinat GPS akurat pada watermark (saat ini `createLaporan` mengisi `lat: 0, lng: 0`).
- Tinjau ulang **ADR-006** apabila pemangku kepentingan menghendaki satu identitas visual monokrom tunggal untuk Web dan Mobile.

