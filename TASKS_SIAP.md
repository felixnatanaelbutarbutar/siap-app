# TASKS.md — SIAP (Sistem Absensi & Pelaporan)
> Urutan: Database → Backend → Mobile → Web Admin
> Setiap task = 1 prompt ke Antigravity. Selesaikan berurutan, jangan loncat.
> Centang task sebelum lanjut ke berikutnya.

---

## Roles Pengguna

| Role | Akses | Platform |
|---|---|---|
| `SATPAM` | Absensi, laporan rutin per jam + harian, serah terima piket | Mobile |
| `CS` | Absensi, laporan kegiatan pelayanan | Mobile |
| `UTILITY` | Absensi, laporan pemeliharaan, serah terima peralatan | Mobile |
| `ADMIN` | Dashboard, review laporan semua divisi, live tracking, master data | Web |

---

## LAYER 0 — Project Setup

### TASK-00 | Inisialisasi Monorepo & Infrastruktur
**Prompt ke Antigravity:**
```
Buat struktur monorepo untuk proyek SIAP dengan folder:
- /backend (Node.js 20 + Express + TypeScript)
- /mobile (React Native 0.74 + TypeScript)
- /web-admin (Vite + React 18 + TypeScript)
- /infra (docker-compose.yml, nginx.conf)

Setup docker-compose.yml yang menjalankan:
1. PostgreSQL 16 di port 5432
2. MinIO di port 9000 (console port 9001)

Buat juga /backend dengan setup awal:
- tsconfig.json, package.json
- struktur folder: src/routes, src/controllers, src/middleware, src/services, src/prisma
- .env.example dengan semua variabel (DATABASE_URL, JWT_SECRET, MINIO_ENDPOINT,
  MINIO_ACCESS_KEY, MINIO_SECRET_KEY, PORT, FCM_SERVICE_ACCOUNT_PATH)
- script: dev (ts-node-dev), build, start (PM2)
```
- [ ] Selesai

---

## LAYER 1 — Database

### TASK-01 | Schema Database (Prisma)
**Prompt ke Antigravity:**
```
Buat Prisma schema lengkap untuk aplikasi SIAP di /backend/src/prisma/schema.prisma.

Aplikasi ini memiliki 4 role pengguna: SATPAM, CS, UTILITY, ADMIN.
SATPAM, CS, dan UTILITY adalah pengguna lapangan di mobile. ADMIN di web.

Tabel yang dibutuhkan:

Staff (pengguna utama — menggantikan tabel "Satpam" yang terlalu spesifik):
  id, nik (unique), nama, password_hash,
  role (enum: SATPAM / CS / UTILITY / ADMIN),
  divisi (enum: KEAMANAN / CUSTOMER_SERVICE / UTILITY / MANAJEMEN),
  area_tugas_id, aktif, fcm_token, created_at

AreaTugas:
  id, nama, lat, lng, radius_meter, aktif

Absensi (sama untuk semua role lapangan):
  id, staff_id, jenis (enum: MASUK/KELUAR/MULAI_ISTIRAHAT/SELESAI_ISTIRAHAT),
  foto_url, lat, lng, akurasi_gps, waktu_server, catatan

Laporan (generik, berlaku untuk semua divisi):
  id, staff_id,
  divisi (KEAMANAN / CUSTOMER_SERVICE / UTILITY),
  kategori — nilainya berbeda per divisi:
    KEAMANAN: PATROLI / PENJAGAAN / PENGAWALAN / INSIDEN / PEMELIHARAAN
    CUSTOMER_SERVICE: KOMPLAIN / INFORMASI / PENGADUAN / LAIN_LAIN
    UTILITY: KEBERSIHAN / KERUSAKAN / PERBAIKAN / PEMERIKSAAN_RUTIN
  judul, deskripsi, foto_urls (Json),
  status (DRAFT/SUBMITTED/APPROVED/REJECTED), komentar_admin,
  created_at, updated_at

LaporanPerJam (khusus SATPAM):
  id, staff_id, tanggal, jam,
  status_keamanan (AMAN/ADA_TEMUAN/PERLU_PERIKSA),
  foto_url, catatan, created_at

SerahTerima (SATPAM untuk piket, UTILITY untuk peralatan):
  id, staff_lama_id, staff_baru_id,
  jenis (enum: PIKET / PERALATAN),
  shift_date, barang_list (Json), catatan,
  foto_urls (Json), ttd_lama_url, ttd_baru_url,
  bast_pdf_url, status (PENDING/SELESAI), created_at

RevokedToken:
  id, token_jti (unique), expired_at

Tambahkan relasi, index pada (staff_id, waktu_server, tanggal, divisi).
Buat seed.ts: 1 admin, 2 satpam, 2 CS, 2 utility dengan data dummy yang masuk akal.
```
- [ ] Selesai

---

## LAYER 2 — Backend

### TASK-02 | Autentikasi & Role Middleware
**Prompt ke Antigravity:**
```
Buat fitur autentikasi di /backend untuk aplikasi SIAP.

Endpoint:
- POST /auth/login: terima { nik, password }, validasi bcryptjs,
  return JWT (payload: id, nik, nama, role, divisi). Expire 12 jam.
- POST /auth/logout: blacklist token JTI ke tabel RevokedToken
- POST /auth/fcm-token: update FCM token staff yang sedang login { fcm_token }

Middleware:
- authenticate: verifikasi JWT, cek blacklist di RevokedToken
- requireRole(...roles): cek role, contoh requireRole('ADMIN') atau requireRole('SATPAM','CS','UTILITY')
- requireDivisi(...divisi): cek divisi untuk akses yang lebih spesifik

Rate limiting login: 5 attempt per IP per 10 menit (express-rate-limit, memory store).
Validasi semua input dengan Zod. Jangan gunakan Redis.
```
- [x] Selesai

### TASK-03 | Fitur Absensi (Semua Role Lapangan)
**Prompt ke Antigravity:**
```
Buat fitur absensi di /backend untuk aplikasi SIAP.
Fitur ini berlaku untuk semua role lapangan: SATPAM, CS, UTILITY.

Endpoint (semua butuh middleware authenticate + requireRole('SATPAM','CS','UTILITY')):
- POST /absensi/masuk: foto (multipart) + { lat, lng, akurasi_gps }
- POST /absensi/keluar: foto + { lat, lng, akurasi_gps }
- POST /absensi/mulai-istirahat: { lat, lng }
- POST /absensi/selesai-istirahat: { lat, lng }
- GET /absensi/hari-ini: absensi staff yang login hari ini
- GET /absensi/riwayat?bulan=&tahun=: riwayat per bulan

Endpoint admin:
- GET /admin/absensi?tanggal=&staff_id=&divisi=: semua absensi, bisa filter per divisi

Validasi GPS server-side dengan geolib:
- Tolak jika jarak > radius area tugas staff tersebut
- Tolak jika akurasi_gps > 50 meter
- Error spesifik: "Anda berada X meter di luar area tugas"

Business logic:
- Tidak bisa absen masuk jika sudah masuk dan belum keluar hari ini
- Total jam kerja = (waktu keluar - waktu masuk) - total istirahat
- Foto diproses watermark via watermark.service.ts lalu upload ke MinIO

Gunakan: geolib, @aws-sdk/client-s3, sharp, multer, zod.
```
- [x] Selesai

### TASK-04 | Upload Foto & Watermark
**Prompt ke Antigravity:**
```
Buat storage service dan watermark service di /backend/src/services/.

storage.service.ts:
- Koneksi MinIO via @aws-sdk/client-s3 (S3-compatible endpoint)
- uploadFile(buffer, filename, mimetype): upload ke bucket "siap-storage"
- getFileUrl(filename): return public URL
- deleteFile(filename): hapus file
- Path struktur:
    absensi/{staff_id}/{tanggal}/{timestamp}.jpg
    laporan/{laporan_id}/{timestamp}.jpg
    serah-terima/{id}/{timestamp}.jpg
    bast/{id}/bast.pdf
    tanda-tangan/{id}/{role}.png

watermark.service.ts:
- addWatermark(imageBuffer, data: { nama, divisi, tanggal_jam, lat, lng, area_tugas }):
  - Watermark visual di pojok kiri bawah: background hitam semi-transparan, teks putih
  - Format: "[NAMA] | [DIVISI] | [DD-MM-YYYY HH:mm:ss] | [lat, lng] | [area]"
  - Embed ulang metadata EXIF (GPS, timestamp, author) via sharp

Watermark dipanggil SEBELUM upload — semua foto di MinIO sudah watermark permanen.
Gunakan: sharp, @aws-sdk/client-s3.
```
- [x] Selesai

### TASK-05 | Fitur Laporan (Semua Divisi)
**Prompt ke Antigravity:**
```
Buat fitur laporan di /backend untuk aplikasi SIAP.
Laporan bersifat generik tapi kategorinya berbeda per divisi:
- KEAMANAN (SATPAM): PATROLI, PENJAGAAN, PENGAWALAN, INSIDEN, PEMELIHARAAN
- CUSTOMER_SERVICE (CS): KOMPLAIN, INFORMASI, PENGADUAN, LAIN_LAIN
- UTILITY: KEBERSIHAN, KERUSAKAN, PERBAIKAN, PEMERIKSAAN_RUTIN

Endpoint laporan harian:
- POST /laporan: { kategori, judul, deskripsi, foto[] }
  Sistem auto-set divisi dari role staff yang login. Validasi kategori sesuai divisi.
- GET /laporan?tanggal=: laporan milik staff yang login
- PUT /laporan/:id: edit (hanya jika status DRAFT)
- GET /admin/laporan?status=&tanggal=&divisi=&staff_id=: semua laporan, filter per divisi
- PATCH /admin/laporan/:id/review: { status: APPROVED/REJECTED, komentar }

Endpoint laporan per jam (SATPAM only, middleware requireRole('SATPAM')):
- POST /laporan-perjam: { jam, status_keamanan, foto, catatan }
- GET /laporan-perjam?tanggal=: laporan per jam hari ini milik satpam
- GET /admin/laporan-perjam?tanggal=&staff_id=: timeline per jam + gap detection
  Response include: jam mana saja yang BELUM ada laporan saat shift aktif

Business logic:
- Laporan per jam hanya bisa dibuat saat satpam sedang absen masuk (belum keluar)
- Satu jam = satu laporan per satpam
- Foto diproses watermark lalu upload ke MinIO
```
- [x] Selesai

### TASK-06 | Fitur Serah Terima (Satpam & Utility)
**Prompt ke Antigravity:**
```
Buat fitur serah terima di /backend untuk aplikasi SIAP.

Ada dua jenis serah terima:
- PIKET: dipakai oleh SATPAM (serah terima shift + barang keamanan)
- PERALATAN: dipakai oleh UTILITY (serah terima alat kerja antar shift)

Endpoint:
- POST /serah-terima/mulai:
  { jenis: PIKET/PERALATAN, staff_baru_id, barang_list, catatan, foto_urls[], ttd_lama (base64) }
  barang_list format: [{ nama, kondisi: BAIK/RUSAK/HILANG, catatan }]
  Hanya bisa dilakukan oleh SATPAM (jenis PIKET) atau UTILITY (jenis PERALATAN)

- POST /serah-terima/:id/konfirmasi:
  { ttd_baru (base64) }
  Hanya bisa dikonfirmasi oleh staff_baru_id yang tercatat
  Setelah konfirmasi → auto generate BAST PDF → upload MinIO → simpan bast_pdf_url

- GET /serah-terima/riwayat: riwayat serah terima milik staff yang login
- GET /serah-terima/:id/bast: redirect ke URL BAST PDF di MinIO
- GET /admin/serah-terima?tanggal=&jenis=&divisi=: semua serah terima untuk admin
- GET /admin/inventaris/bermasalah: barang kondisi RUSAK/HILANG dari semua serah terima

BAST PDF menggunakan pdfkit:
- Header: "BERITA ACARA SERAH TERIMA [PIKET/PERALATAN]"
- Info: tanggal, divisi, nama staff lama & baru
- Tabel barang (nama, kondisi, catatan) — baris merah jika RUSAK/HILANG
- Catatan penting
- Embed tanda tangan (dari base64) + nama + timestamp
- Footer: "Dokumen digital oleh sistem SIAP"
```
- [x] Selesai

### TASK-07 | Dashboard API & Statistik Admin
**Prompt ke Antigravity:**
```
Buat endpoint dashboard dan statistik untuk admin di /backend.
Semua endpoint butuh middleware requireRole('ADMIN').

GET /admin/dashboard/summary:
  Response: {
    per_divisi: {
      KEAMANAN: { hadir, tidak_hadir, sedang_istirahat },
      CUSTOMER_SERVICE: { hadir, tidak_hadir, sedang_istirahat },
      UTILITY: { hadir, tidak_hadir, sedang_istirahat }
    },
    laporan_pending: total laporan pending review (semua divisi),
    barang_bermasalah: total barang RUSAK/HILANG dari serah terima bulan ini
  }

GET /admin/dashboard/live-tracking:
  Response: [{ staff_id, nama, divisi, role, lat, lng, updated_at, status_absensi }]
  Hanya staff yang sedang shift aktif (sudah absen masuk, belum absen keluar)

GET /admin/statistik/kehadiran?bulan=&tahun=&divisi=:
  Response per staff: total_hadir, total_jam_kerja, rata_jam_per_hari
  Bisa filter per divisi (KEAMANAN/CUSTOMER_SERVICE/UTILITY/semua)

GET /admin/export/absensi?bulan=&tahun=&divisi=&format=csv:
  Export CSV untuk HR/Payroll, bisa filter per divisi
  Gunakan papaparse

Master data endpoints:
- GET/POST /admin/staff: list + tambah staff
- PUT /admin/staff/:id: edit staff
- PATCH /admin/staff/:id/toggle-aktif: aktifkan/nonaktifkan
- GET/POST /admin/area-tugas: list + tambah area tugas
- PUT /admin/area-tugas/:id: edit area tugas
```
- [x] Selesai

### TASK-08 | WebSocket Live Tracking
**Prompt ke Antigravity:**
```
Buat WebSocket server menggunakan Socket.io di /backend untuk live tracking.

Setup:
- Integrasikan Socket.io dengan Express server yang sudah ada
- Autentikasi socket menggunakan JWT (kirim token di handshake auth)
- Simpan posisi terakhir di Map() di memory server: Map<staff_id, LocationData>

Events dari Mobile (staff emit):
- "location:update" { lat, lng, akurasi } → update Map, broadcast ke semua admin

Events ke Web Admin (server emit):
- "location:updated" { staff_id, nama, divisi, role, lat, lng, updated_at }
- "absensi:new" { staff_id, nama, divisi, jenis, waktu }
- "laporan:new" { staff_id, nama, divisi, kategori }
- "serah_terima:new" { staff_id, nama, divisi, jenis }

Logic:
- Staff kirim lokasi setiap 30 detik saat app aktif
- Saat admin connect → kirim snapshot semua posisi di Map()
- Saat staff disconnect → hapus dari Map()
- Admin masuk ke room "admin" — semua broadcast hanya ke room ini
```
- [x] Selesai

### TASK-09 | Push Notification & Reminder
**Prompt ke Antigravity:**
```
Buat fitur push notification di /backend menggunakan Firebase Admin SDK.

notification.service.ts:
- sendToDevice(fcm_token, title, body, data): kirim ke satu perangkat
- sendToDivisi(divisi, title, body, data): kirim ke semua staff divisi tertentu
- sendToRole(role, title, body, data): kirim ke semua staff dengan role tertentu

Kapan notifikasi dikirim:
- Laporan baru masuk (semua divisi) → admin dapat push notif
- Laporan di-approve/reject → staff yang bersangkutan dapat notif
- Admin kirim broadcast manual → semua staff dapat notif

Endpoint:
- POST /admin/notifikasi/broadcast: { divisi?, role?, judul, pesan } — admin broadcast manual

Scheduled reminders via node-cron:
- Setiap jam tepat (08:00, 09:00, ... 22:00):
  Cek satpam yang sedang shift aktif tapi belum isi laporan per jam untuk jam tersebut
  Kirim reminder: "Belum mengisi laporan per jam untuk pukul [jam]:00"
  Khusus untuk role SATPAM saja — CS dan UTILITY tidak ada laporan per jam

Gunakan: firebase-admin, node-cron.
```
- [x] Selesai

---

## LAYER 3 — Mobile

### TASK-10 | Setup Navigasi & Struktur Layar
**Prompt ke Antigravity:**
```
Setup struktur navigasi untuk aplikasi SIAP di /mobile.
Aplikasi dipakai oleh 3 role lapangan: SATPAM, CS, dan UTILITY.
Tampilan menu berbeda per role karena fitur berbeda.

Navigasi menggunakan React Navigation v6:
- AuthStack: LoginScreen
- AppStack (setelah login, konten berbeda per role):

  BottomTabNavigator — tab ditampilkan conditional berdasarkan role:
  - Tab "Beranda": semua role
  - Tab "Absensi": semua role
  - Tab "Laporan": semua role (konten form berbeda per role)
  - Tab "Per Jam": SATPAM only (laporan per jam)
  - Tab "Profil": semua role

  Modal stack (bisa dibuka dari mana saja):
  - SerahTerimaScreen: SATPAM (piket) dan UTILITY (peralatan)
  - KonfirmasiSerahTerimaScreen: SATPAM dan UTILITY

Buat semua file layar sebagai placeholder:
  src/screens/auth/LoginScreen.tsx
  src/screens/main/BerandaScreen.tsx
  src/screens/main/AbsensiScreen.tsx
  src/screens/laporan/ListLaporanScreen.tsx
  src/screens/laporan/BuatLaporanScreen.tsx  ← form kategori berbeda per role
  src/screens/laporan/DetailLaporanScreen.tsx
  src/screens/laporan/LaporanPerJamScreen.tsx  ← SATPAM only
  src/screens/serahterima/SerahTerimaScreen.tsx  ← SATPAM & UTILITY
  src/screens/serahterima/KonfirmasiSerahTerimaScreen.tsx
  src/screens/profil/ProfilScreen.tsx

Setup:
- Zustand authStore: simpan { id, nik, nama, role, divisi, token }
- Axios instance src/services/api.ts: base URL dari env, JWT interceptor
- JWT disimpan di react-native-encrypted-storage
- React Native Paper theme: warna primary #1a3c6e
```
- [x] Selesai

### TASK-11 | Layar Login & Autentikasi
**Prompt ke Antigravity:**
```
Buat LayarLogin lengkap di /mobile/src/screens/auth/LoginScreen.tsx untuk SIAP.

UI:
- Logo SIAP di atas tengah
- Input NIK (keyboard numeric)
- Input Password (secure, toggle show/hide)
- Tombol Login (full width, biru tua)
- Loading state saat proses
- Pesan error jika gagal

Logic:
- Validasi: NIK tidak boleh kosong, password min 6 karakter
- Panggil POST /auth/login → simpan token + data user ke authStore + encrypted storage
- Navigasi ke AppStack setelah sukses
- Auto-login: cek token tersimpan saat app buka
- Tombol biometrik (fingerprint/Face ID) jika pernah login sebelumnya

Gunakan: react-native-biometrics, react-native-encrypted-storage, Zustand authStore.
```
- [x] Selesai

### TASK-12 | Fitur Absensi (Kamera + GPS)
**Prompt ke Antigravity:**
```
Buat fitur absensi di /mobile untuk semua role lapangan (SATPAM, CS, UTILITY).
Fitur ini identik untuk ketiga role — tidak ada perbedaan.

AbsensiScreen.tsx:
- Status absensi hari ini: belum absen / sedang shift / istirahat / sudah keluar
- Tombol aksi kontekstual: "Absen Masuk" / "Mulai Istirahat" / "Selesai Istirahat" / "Absen Keluar"
- Jam masuk, durasi kerja berjalan (update tiap menit), durasi istirahat
- Timeline absensi hari ini

Flow absen masuk/keluar:
1. Tap tombol → minta izin GPS + kamera
2. Deteksi fake GPS via react-native-mock-location-detector → tolak jika terdeteksi
3. Ambil koordinat GPS via react-native-geolocation-service (timeout 10 detik)
4. Buka live camera (react-native-vision-camera) untuk foto selfie
5. Tambah watermark visual via react-native-image-manipulator:
   "[NAMA] | [DIVISI] | [TANGGAL JAM] | [LAT, LNG]"
6. Upload foto + koordinat ke POST /absensi/masuk atau /absensi/keluar
7. Feedback sukses/error — jika di luar area: tampilkan jarak aktual

Offline-first: simpan ke SQLite dulu, sync via react-query saat online.

Gunakan: react-native-vision-camera, react-native-geolocation-service,
react-native-image-manipulator, react-native-mock-location-detector,
op-sqlite, react-query.
```
- [x] Selesai

### TASK-13 | Fitur Laporan (Berbeda per Role)
**Prompt ke Antigravity:**
```
Buat fitur laporan di /mobile untuk SIAP. Form kategori berbeda per role.

ListLaporanScreen.tsx (sama untuk semua role):
- List laporan dengan badge status
- Pull-to-refresh
- Tombol "+" untuk buat laporan baru

BuatLaporanScreen.tsx — form kategori otomatis menyesuaikan role user yang login:
- Role SATPAM → dropdown kategori: Patroli / Penjagaan / Pengawalan / Insiden / Pemeliharaan
- Role CS → dropdown kategori: Komplain / Informasi / Pengaduan / Lain-lain
- Role UTILITY → dropdown kategori: Kebersihan / Kerusakan / Perbaikan / Pemeriksaan Rutin
- Input judul (TextInput)
- Input deskripsi (multiline)
- Upload foto max 3, dengan watermark otomatis via kamera
- Tombol "Simpan Draft" dan "Submit"

DetailLaporanScreen.tsx (sama untuk semua role):
- Detail laporan + foto gallery
- Status dan komentar admin

LaporanPerJamScreen.tsx — SATPAM only (sembunyikan tab ini untuk CS dan UTILITY):
- Timeline visual jam 00:00–23:00
- Jam sudah lapor: hijau
- Jam belum lapor (saat shift aktif): kuning, tap untuk isi
- Form: dropdown status keamanan (Aman/Ada Temuan/Perlu Periksa) + foto wajib + catatan
- Notifikasi lokal terjadwal via Notifee (reminder per jam saat shift aktif)

Gunakan: react-query, op-sqlite, Notifee.
```
- [x] Selesai

### TASK-14 | Fitur Serah Terima (Satpam & Utility)
**Prompt ke Antigravity:**
```
Buat fitur serah terima di /mobile untuk SIAP.
Fitur ini hanya muncul untuk role SATPAM (jenis Piket) dan UTILITY (jenis Peralatan).
Sembunyikan menu ini untuk role CS.

SerahTerimaScreen.tsx:
- Header label otomatis: "Serah Terima Piket" (SATPAM) atau "Serah Terima Peralatan" (UTILITY)
- Dropdown pilih staff pengganti (hanya tampilkan staff dengan role & divisi yang sama)
- Checklist barang:
  SATPAM default: Kunci Gerbang, Radio HT, Senter, Rompi, Sepatu Dinas, Kendaraan Patroli
  UTILITY default: Sapu, Alat Pel, Mesin Vacuum, Tangga, Toolkit, APD
  Setiap item: kondisi toggle (BAIK/RUSAK/HILANG) + catatan opsional
- Upload foto kondisi barang (max 3)
- Catatan untuk shift berikutnya
- Canvas tanda tangan digital (react-native-signature-canvas)
- Tombol "Kirim Serah Terima"

KonfirmasiSerahTerimaScreen.tsx:
- Badge notifikasi di Beranda jika ada serah terima pending untuk staff ini
- Tampilkan detail: daftar barang + kondisi + catatan dari staff lama
- Canvas tanda tangan untuk konfirmasi
- Tombol "Konfirmasi Terima"
- Setelah konfirmasi → preview BAST PDF dari backend
- Tombol download/share PDF

Gunakan: react-native-signature-canvas, react-native-pdf, react-native-share.
```
- [x] Selesai

### TASK-15 | Notifikasi & Offline Sync
**Prompt ke Antigravity:**
```
Setup notifikasi dan offline sync di /mobile untuk SIAP.

Push Notification (Firebase):
- Setup @react-native-firebase/messaging
- Minta izin saat pertama login
- Kirim FCM token ke POST /auth/fcm-token saat app dibuka
- Handle notif foreground: tampilkan in-app banner
- Handle notif background/killed: buka layar relevan

Notifikasi Lokal (Notifee) — khusus SATPAM:
- Jadwal reminder per jam dibuat saat absen masuk
- Dibatalkan saat absen keluar
- Akurat di Android 13+ (SCHEDULE_EXACT_ALARM)

Offline Sync:
- react-query dengan persistence ke op-sqlite
- Semua mutation tulis ke SQLite dulu (optimistic update)
- react-native-netinfo deteksi koneksi → trigger sync
- Indicator "Data belum tersinkron" di header jika ada pending
- Konflik: server_timestamp, last-write-wins

Live Tracking (saat app foreground):
- Kirim lokasi ke Socket.io setiap 30 detik saat shift aktif
- Hentikan saat app background (hemat baterai)
- Koneksi Socket.io dibuat saat login, putus saat logout
```
- [x] Selesai

---

## LAYER 4 — Web Admin

### TASK-16 | Setup Web Admin & Layout
**Prompt ke Antigravity:**
```
Setup project web admin di /web-admin untuk SIAP.
Hanya diakses oleh role ADMIN.

Tech stack: Vite + React 18 + TypeScript + shadcn/ui + TanStack Router

Routes:
  /login → LoginPage
  / → redirect ke /dashboard
  /dashboard → DashboardPage
  /absensi → AbsensiPage
  /laporan → LaporanPage
  /serah-terima → SerahTerimaPage
  /staff → StaffPage  ← manajemen semua staff (Satpam, CS, Utility)
  /pengaturan → PengaturanPage

Layout:
- Sidebar kiri: logo SIAP, menu navigasi, nama admin yang login, tombol logout
- Header atas: judul halaman + breadcrumb
- Konten utama

Setup:
- shadcn/ui tema neutral, primary #1a3c6e
- Axios instance src/services/api.ts dengan JWT interceptor
- Zustand authStore: { id, nama, token }
- Semua route protected → redirect /login jika belum auth
- Buat semua halaman sebagai placeholder dulu
```
- [ ] Selesai

### TASK-17 | Halaman Dashboard & Live Tracking
**Prompt ke Antigravity:**
```
Buat DashboardPage di /web-admin/src/pages/DashboardPage.tsx untuk SIAP.

Summary cards — ditampilkan PER DIVISI (3 baris: Keamanan, CS, Utility):
Setiap baris tampilkan: Hadir / Tidak Hadir / Sedang Istirahat
Plus satu kartu total: Laporan Pending Review + Barang Bermasalah
Data dari GET /admin/dashboard/summary, auto-refresh setiap 60 detik.

Live Tracking Map (tengah):
- Peta react-leaflet dengan tile OpenStreetMap
- Marker per staff yang sedang shift
- Warna marker berbeda per divisi:
  Keamanan (biru) / CS (hijau) / Utility (oranye)
- Marker abu jika tidak update > 5 menit
- Klik marker → popup: nama, divisi, status absensi, waktu update terakhir
- Tampilkan area tugas sebagai circle overlay
- Update real-time via Socket.io

Feed aktivitas terbaru (bawah kanan):
- 10 aktivitas terakhir semua divisi, real-time via Socket.io
- Kolom: waktu, nama, divisi (badge), jenis aktivitas

Chart kehadiran 7 hari terakhir per divisi (bawah kiri, Recharts grouped bar chart)

Gunakan: react-leaflet, socket.io-client, recharts, react-query.
```
- [x] Selesai

### TASK-18 | Halaman Absensi & Statistik
**Prompt ke Antigravity:**
```
Buat AbsensiPage di /web-admin/src/pages/AbsensiPage.tsx untuk SIAP.

Filter:
- Date picker (default hari ini)
- Dropdown divisi: Semua / Keamanan / CS / Utility
- Dropdown staff (isi berdasarkan divisi yang dipilih)

Tabel absensi:
- Kolom: Nama, Divisi (badge berwarna), Jam Masuk, Istirahat, Jam Keluar, Total Jam, Status
- Klik baris → modal detail: foto masuk + foto keluar + koordinat GPS
- Staff yang belum absen tetap muncul dengan status merah
- Pagination 20 baris

Tab Statistik Bulanan:
- Filter bulan, tahun, divisi
- Tabel per staff: total hadir, total jam kerja, rata-rata jam/hari
- Grouped bar chart (Recharts): kehadiran per hari, dikelompokkan per divisi
- Tombol "Export CSV" per divisi

Gunakan: shadcn/ui, react-query, date-fns.
```
- [x] Selesai

### TASK-19 | Halaman Laporan & Review
**Prompt ke Antigravity:**
```
Buat LaporanPage di /web-admin/src/pages/LaporanPage.tsx untuk SIAP.

Tab 1 — Laporan Harian (semua divisi):
Filter: tanggal, divisi, status, kategori (opsi kategori berubah sesuai divisi yang dipilih)
Tabel dengan badge status dan badge divisi berwarna
Badge di menu sidebar menunjukkan jumlah laporan pending

Klik laporan → slide-over panel (shadcn/ui Sheet) di kanan:
- Detail laporan + foto gallery
- Divisi dan kategori yang dipilih staff
- Form review: dropdown APPROVED/REJECTED + textarea komentar + tombol Submit
- Riwayat review

Tab 2 — Laporan Per Jam (Keamanan/SATPAM only):
- Filter tanggal + satpam
- Timeline visual 24 jam:
  Laporan ada: hijau
  Gap (dalam range shift): merah
  Di luar shift: abu-abu
- Tabel detail di bawah

Gunakan: shadcn/ui Sheet, react-query optimistic update.
```
- [x] Selesai

### TASK-20 | Halaman Serah Terima & Manajemen Staff
**Prompt ke Antigravity:**
```
Buat dua halaman terakhir di /web-admin untuk SIAP.

SerahTerimaPage.tsx:
Filter: tanggal, jenis (Piket/Peralatan), divisi
Tabel: staff lama, staff baru, divisi, jenis, tanggal, status

Klik baris → modal detail:
- Info lengkap serah terima
- Tabel kondisi barang: baris merah jika RUSAK/HILANG
- Preview/download BAST PDF

Tab "Inventaris Bermasalah":
- Tabel barang RUSAK/HILANG dari semua serah terima
- Kolom: nama barang, kondisi, tanggal, divisi, staff lama, staff baru
- Filter per divisi

StaffPage.tsx (manajemen semua staff):
Filter/tab per divisi: Semua / Keamanan / CS / Utility
Tabel: nama, NIK, divisi, role, area tugas, status aktif

Tambah/edit staff → modal form:
- NIK, nama, password (opsional saat edit), divisi (KEAMANAN/CUSTOMER_SERVICE/UTILITY/MANAJEMEN),
  role (otomatis sesuai divisi: KEAMANAN→SATPAM, CUSTOMER_SERVICE→CS, UTILITY→UTILITY, MANAJEMEN→ADMIN),
  area tugas (dropdown dari tabel AreaTugas)
- Toggle aktif/nonaktif

PengaturanPage.tsx — Tab Area Tugas:
- Tabel area tugas
- Modal tambah/edit: nama, lat, lng, radius
- Mini peta react-leaflet di modal untuk konfirmasi titik koordinat

Gunakan: shadcn/ui Dialog, Form, Table, react-leaflet.
```
- [x] Selesai

---

## LAYER 5 — Finishing

### TASK-21 | Error Handling & Polish
**Prompt ke Antigravity:**
```
Polish menyeluruh semua layer aplikasi SIAP.

Backend:
- Global error handler middleware: format semua error jadi { success: false, message, code }
- Handle Prisma errors (P2002, P2025) dengan pesan user-friendly bahasa Indonesia
- Winston logging semua error ke file

Mobile:
- Loading skeleton di semua layar yang fetch data
- Empty state (ilustrasi + teks) saat data kosong, berbeda per konten
- Error boundary di level navigator utama
- Toast notification untuk aksi sukses/gagal (react-native-toast-message)
- Konfirmasi dialog sebelum aksi penting (logout, submit laporan, konfirmasi serah terima)

Web Admin:
- Loading skeleton di semua tabel dan kartu
- Empty state di semua tabel (berbeda per halaman)
- Toaster shadcn/ui untuk aksi sukses/gagal
- Error page 404 + error boundary
- Konfirmasi dialog sebelum approve/reject laporan
```
- [x] Selesai

### TASK-22 | Testing & Production Setup
**Prompt ke Antigravity:**
```
Setup testing dan konfigurasi production untuk SIAP.

Backend Testing (Jest + Supertest):
- Test auth: login sukses/gagal per role, token blacklist
- Test validasi GPS: dalam radius (sukses), luar radius (tolak)
- Test absensi: alur masuk-istirahat-keluar lengkap
- Test laporan: validasi kategori sesuai divisi (CS tidak bisa kirim kategori SATPAM)
- Setup test database terpisah di .env.test

Docker Production (/infra/docker-compose.prod.yml):
- backend (NODE_ENV=production)
- PostgreSQL dengan volume persistent + backup script harian
- MinIO dengan volume persistent
- Nginx reverse proxy:
  /api/* → backend:3000
  /* → web-admin static files
  HTTPS config placeholder untuk SSL cert

nginx.conf: gzip compression, security headers, client_max_body_size 10M (untuk foto)

GitHub Actions (.github/workflows/deploy.yml):
- Trigger: push ke main
- Steps: checkout → build → SSH ke NevaCloud VPS → docker compose up -d

README.md lengkap:
- Cara setup development
- Cara deploy ke NevaCloud
- Cara backup & restore database
- Cara update FCM credentials
```
- [x] Selesai

---

## Urutan Eksekusi (Quick Reference)

```
TASK-00  Monorepo & Docker Compose
   ↓
TASK-01  Schema Database (Staff, Absensi, Laporan, SerahTerima)
   ↓
TASK-02  Autentikasi & Role Middleware
TASK-03  Absensi Backend (semua role)
TASK-04  Upload Foto & Watermark
TASK-05  Laporan Backend (kategori per divisi)
TASK-06  Serah Terima Backend (Piket & Peralatan)
TASK-07  Dashboard API & Statistik
TASK-08  WebSocket Live Tracking
TASK-09  Push Notification & Reminder
   ↓
TASK-10  Setup Navigasi Mobile (conditional per role)
TASK-11  Login Mobile
TASK-12  Absensi Mobile
TASK-13  Laporan Mobile (form berbeda per role)
TASK-14  Serah Terima Mobile (SATPAM & UTILITY)
TASK-15  Notifikasi & Offline Sync
   ↓
TASK-16  Setup Web Admin & Layout
TASK-17  Dashboard & Live Tracking Web
TASK-18  Absensi & Statistik Web
TASK-19  Laporan & Review Web (filter per divisi)
TASK-20  Serah Terima & Manajemen Staff Web
   ↓
TASK-21  Error Handling & Polish
TASK-22  Testing & Production Setup
```

---

## Cara Pakai

1. Buka sesi Antigravity baru
2. Load `ARCHITECTURE_SIAP.md` sebagai context di awal sesi
3. Copy satu blok prompt dari task aktif
4. Paste ke Antigravity, biarkan generate
5. Review, centang task
6. Lanjut task berikutnya di sesi yang sama