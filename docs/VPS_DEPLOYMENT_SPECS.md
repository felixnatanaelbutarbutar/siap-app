# Spesifikasi Server VPS & Panduan Deploy SIAP (Web Admin, Backend, Storage & APK Android)

Dokumen ini merangkum kebutuhan spesifikasi server VPS, arsitektur layanan, estimasi penyimpanan, konfigurasi jaringan/domain, serta persiapan build **APK Android Release** untuk menjalankan sistem **SIAP (Sistem Informasi Absensi & Pelaporan)** di lingkungan produksi.

---

## 1. Komponen yang Berjalan di VPS

Aplikasi mobile Android dijalankan di perangkat masing-masing petugas dalam bentuk file `.apk`. Oleh karena itu, VPS hanya perlu menjalankan komponen sisi server berikut:

| Komponen | Teknologi di SIAP | Fungsi Utama | Estimasi Pemakaian RAM |
| :--- | :--- | :--- | :--- |
| **Reverse Proxy & Web Static** | Nginx + Certbot (SSL) | Melayani Web Admin (`web-admin/dist`), HTTPS, WebSocket upgrade (`/socket.io/`), serta proxy ke Backend & MinIO | 50 - 100 MB |
| **Backend API & Realtime** | Node.js 20 LTS + PM2 (Express, Prisma, Socket.io, `sharp`, `pdfkit`, `node-cron`) | REST API, autentikasi JWT, validasi geofence & RSA device, watermark foto (`sharp`), cetak PDF BAST (`pdfkit`), cron pengingat 1 jam shift | 300 - 700 MB (puncak saat banyak upload foto serentak) |
| **Database Utama** | PostgreSQL 15 / 16 | Menyimpan data staff, jadwal, shift, absensi, laporan, izin/cuti, BAST, dan audit log | 300 - 600 MB |
| **Object Storage** | MinIO (S3-Compatible) | Menyimpan foto selfie absensi, foto laporan, tanda tangan digital, PDF BAST, dan private bucket (`siap-storage-private`) | 300 - 500 MB |
| **Sistem Operasi & Overhead** | Ubuntu 22.04 / 24.04 LTS | Kernel Linux, systemd, firewall (UFW), monitoring, dan cache OS | 300 - 400 MB |

**Total kebutuhan RAM rata-rata saat idle/normal:** sekitar **1.3 - 1.8 GB**, dengan lonjakan sementara hingga **2.2 - 2.8 GB** saat jam pergantian shift (banyak petugas melakukan absen selfie bersamaan dan `sharp` memproses gambar secara paralel).

---

## 2. Rekomendasi Spesifikasi VPS Berdasarkan Skala Pengguna

### A. Skala Kecil / Pilot (15 sampai 50 Staff Aktif)
Cocok untuk uji coba produksi, satu gedung, atau operasional tim kecil.
- **CPU:** 2 vCPU
- **RAM:** 2 GB RAM (**wajib tambah Swap 2 GB** agar tidak OOM saat jam absen serentak)
- **Storage:** 40 GB - 50 GB SSD / NVMe
- **Bandwidth:** minimal 1 TB / bulan
- **OS:** Ubuntu 24.04 LTS (64-bit)
- **Estimasi Biaya:** sekitar Rp 80.000 - Rp 180.000 / bulan

### B. Skala Menengah / Rekomendasi Produksi (50 sampai 200 Staff Aktif) [Disarankan]
Spesifikasi paling ideal dan aman agar PostgreSQL, MinIO, Node.js (`sharp`/`pdfkit`), dan WebSocket live tracking berjalan mulus tanpa lag.
- **CPU:** 2 - 4 vCPU
- **RAM:** **4 GB RAM** (+ Swap 2 GB)
- **Storage:** **80 GB - 100 GB SSD / NVMe**
- **Bandwidth:** minimal 2 TB / bulan
- **OS:** Ubuntu 24.04 LTS (64-bit)
- **Estimasi Biaya:** sekitar Rp 150.000 - Rp 350.000 / bulan

### C. Skala Besar / Multi-Gedung (200 sampai 1.000+ Staff Aktif)
Cocok untuk beberapa lokasi/proyek dengan lalu lintas foto dan live tracking tinggi.
- **CPU:** 4 - 8 vCPU
- **RAM:** 8 GB RAM
- **Storage:** 160 GB - 250 GB NVMe (atau pindahkan file foto/PDF dari MinIO lokal ke Object Storage terkelola seperti Cloudflare R2 / AWS S3 / Biznet Neo Object Storage)
- **OS:** Ubuntu 24.04 LTS (64-bit)
- **Estimasi Biaya:** sekitar Rp 450.000 - Rp 900.000 / bulan

> **Catatan Lokasi Server:** Pilih region server terdekat dengan pengguna di Indonesia (misalnya **Jakarta / Indonesia** atau **Singapura**) agar latensi upload foto absensi, GPS live tracking, dan WebSocket tetap cepat (< 50 ms).

---

## 3. Estimasi Pertumbuhan Storage (Foto & PDF)

Setiap file gambar absensi/laporan dikompresi oleh backend sebelum disimpan ke MinIO (rata-rata 150 KB - 300 KB per foto).

| Jumlah Staff Aktif | Estimasi Foto & PDF / Hari | Kebutuhan / Bulan | Kebutuhan / Tahun |
| :--- | :--- | :--- | :--- |
| **30 Staff** | ~90 file (~22 MB/hari) | ~660 MB | ~8 GB |
| **100 Staff** | ~300 file (~75 MB/hari) | ~2.3 GB | ~27 GB |
| **300 Staff** | ~900 file (~225 MB/hari) | ~6.8 GB | ~82 GB |

Tambahkan ruang cadangan minimal 20 GB untuk OS, database PostgreSQL, log PM2/Nginx, dan backup harian.

---

## 4. Kebutuhan Jaringan, Domain & Software di VPS

### Software Wajib di VPS
1. **Ubuntu 22.04 LTS atau 24.04 LTS** dengan zona waktu server disetel ke **`Asia/Jakarta` (WIB)**:
   ```bash
   sudo timedatectl set-timezone Asia/Jakarta
   ```
2. **Docker & Docker Compose** (paling praktis untuk menjalankan PostgreSQL + MinIO dengan volume persisten) atau instalasi native.
3. **Node.js 20 LTS** + **PM2** (`npm i -g pm2`) untuk menjalankan backend secara persisten dan otomatis restart jika terjadi error.
4. **Nginx** + **Certbot (Let's Encrypt)** untuk HTTPS gratis otomatis.
5. **Firewall (UFW):** hanya buka port `22` (SSH), `80` (HTTP redirect), dan `443` (HTTPS). **Jangan** membuka port `5432` (PostgreSQL), `3000` (Backend), atau `9000/9001` (MinIO) langsung ke publik; semua trafik publik diarahkan lewat Nginx HTTPS.

### Struktur Domain / Subdomain yang Disarankan
Gunakan satu domain utama dengan SSL aktif (HTTPS wajib agar Android tidak memblokir koneksi dan token JWT aman):
- `https://siap.domain-anda.com` : Web Admin (static build `web-admin/dist`)
- `https://siap.domain-anda.com/api/` (atau `https://api.domain-anda.com`) : Reverse proxy ke Backend `127.0.0.1:3000`
- `https://siap.domain-anda.com/socket.io/` : Reverse proxy WebSocket (`Upgrade` & `Connection`) ke `127.0.0.1:3000`
- `https://storage.domain-anda.com` (atau `/storage/`) : Reverse proxy publik read-only ke bucket MinIO `127.0.0.1:9000/siap-storage`
- `https://siap.domain-anda.com/download/siap-mobile.apk` : Tautan unduh langsung file `.apk` untuk staff

---

## 5. Checklist Konfigurasi Sebelum Deploy

### A. Backend (`backend/.env` di VPS)
Pastikan seluruh variabel lingkungan produksi diisi dengan kredensial kuat (jangan pakai nilai default development):
- `NODE_ENV=production`
- `PORT=3000`
- `TZ=Asia/Jakarta`
- `DATABASE_URL=postgresql://siap_user:PASSWORD_KUAT@127.0.0.1:5432/siap_db`
- `JWT_SECRET=<string acak minimal 64 karakter>`
- `CORS_ORIGIN=https://siap.domain-anda.com`
- `MINIO_ENDPOINT=127.0.0.1`
- `MINIO_PORT=9000`
- `MINIO_USE_SSL=false` (karena komunikasi lokal di dalam VPS; akses publik melalui Nginx HTTPS)
- `MINIO_ACCESS_KEY=<access key kuat>`
- `MINIO_SECRET_KEY=<secret key kuat>`
- `MINIO_BUCKET=siap-storage`
- `MINIO_PUBLIC_URL=https://storage.domain-anda.com/siap-storage` (jika dipakai untuk URL publik file)
- Kredensial Firebase Admin (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) agar notifikasi push FCM 1 jam sebelum shift berjalan penuh di produksi.

### B. Web Admin (`web-admin/.env.production`)
Setel URL produksi sebelum menjalankan `npm run build`:
```env
VITE_API_URL=https://api.domain-anda.com
VITE_SOCKET_URL=https://api.domain-anda.com
```
Hasil build di folder `web-admin/dist/` disalin ke `/var/www/siap-admin` dan dilayani langsung oleh Nginx (dengan fallback `try_files $uri $uri/ /index.html;` untuk TanStack Router).

---

## 6. Persiapan Build APK Android Release (`.apk`)

Aplikasi mobile dibangun di komputer pengembang (tidak perlu di VPS), lalu file `.apk` final dibagikan kepada petugas (via WhatsApp internal atau tautan unduh di VPS).

### Langkah 1: Ganti URL `localhost` ke Domain HTTPS VPS
Sebelum build APK release, ubah 2 file berikut pada folder `mobile/`:

1. **`mobile/src/services/api.ts`**
   Ubah:
   ```ts
   export const API_BASE_URL = 'https://api.domain-anda.com';
   ```
   *(Socket.io di `mobile/src/services/socket.ts` otomatis mengikuti `API_BASE_URL`.)*

2. **`mobile/src/services/url.ts`**
   Ubah:
   ```ts
   const STORAGE_BASE = 'https://storage.domain-anda.com/siap-storage';
   ```

### Langkah 2: Buat Keystore Produksi (Cukup Sekali, Simpan Baik-Baik!)
Jangan gunakan `debug.keystore` untuk produksi. Buat keystore sendiri:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore siap-release.keystore -alias siap-key -keyalg RSA -keysize 2048 -validity 10000
```
Simpan file `siap-release.keystore` dan password-nya di tempat aman (jika hilang, update APK di masa depan tidak bisa menimpa aplikasi lama tanpa uninstall).

### Langkah 3: Konfigurasi `signingConfigs.release` di `mobile/android/app/build.gradle`
Tambahkan blok `release` pada `signingConfigs` (baca password dari `gradle.properties` agar tidak ikut ter-commit ke Git) dan arahkan `buildTypes.release.signingConfig` ke `signingConfigs.release`. Naikkan juga `versionCode` dan `versionName` setiap kali merilis pembaruan APK.

### Langkah 4: Build File `.apk` Release
Jalankan perintah berikut dari folder `mobile/android/`:
```bash
./gradlew assembleRelease
```
File APK siap pakai akan tersedia di:
```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```
*(Ukuran rata-rata sekitar 35 - 55 MB. Jika ingin lebih kecil lagi sekitar 20 - 30 MB per arsitektur, aktifkan `splits.abi` untuk `arm64-v8a` di `build.gradle`.)*

### Langkah 5: Distribusi APK ke HP Staff
1. Unggah `app-release.apk` ke VPS (misal `/var/www/siap-downloads/siap-v1.0.apk`).
2. Bagikan tautan `https://siap.domain-anda.com/download/siap-v1.0.apk` ke grup operasional.
3. Staff mengunduh dan memasang APK (izinkan *Install from Unknown Sources* saat pemasangan pertama).
4. Setelah login pertama kali, staff mendaftarkan perangkat di halaman **Absensi** dan Admin menyetujuinya satu kali di Web Admin (**Rekap & Verifikasi -> Perangkat**).

---

## 7. Checklist Pemeliharaan & Backup Produksi

- **Backup Database Harian Otomatis (Cron di VPS):** jalankan `pg_dump` terkompresi setiap pukul 02.00 WIB dengan retensi 14 sampai 30 hari, dan salin backup ke storage terpisah (misal Google Drive via `rclone` atau bucket eksternal).
- **Backup MinIO Berkala:** sinkronisasi folder data MinIO (`siap-storage` dan `siap-storage-private`) minimal mingguan.
- **Monitoring Resource:** pantau penggunaan disk (`df -h`), RAM (`free -h`), dan status proses PM2 (`pm2 monit` / `pm2 logs`).
- **Auto-Renew SSL:** pastikan `certbot.timer` aktif agar sertifikat HTTPS Let's Encrypt diperpanjang otomatis setiap 90 hari.
