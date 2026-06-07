<div align="center">
  <br />
  <img src="https://raw.githubusercontent.com/tanstack/router/main/media/repo-header.png" alt="SIAP Banner" width="100%" style="border-radius: 8px; filter: grayscale(100%);" />
  <br />
  <br />

  <h1 align="center">⬛ SIAP (Sistem Absensi & Pelaporan)</h1>
  
  <p align="center">
    <strong>Aplikasi Operasional Lintas Divisi (Satpam, CS, Utility) Kelas Premium</strong><br/>
    <em>Dirancang dengan Arsitektur Monokrom yang Tegas, Kokoh, dan Tanpa Kompromi.</em>
  </p>
  
  <br />
</div>

---

## 🏴 Tentang SIAP

**SIAP** adalah ekosistem aplikasi terpadu (Mobile & Web) yang dirancang khusus untuk memenuhi tingginya standar disiplin operasional di lapangan. Mengusung gaya desain *Nike-Style Brutalism*, aplikasi ini membuang segala ornamen visual yang tidak perlu, dan hanya memusatkan perhatian pada **Fungsi, Kecepatan, dan Keandalan Data**.

Dilengkapi dengan sistem *Geo-fencing* akurat, *Socket.io Live Tracking*, dan *Offline-Sync*, SIAP memastikan setiap langkah patroli, laporan kerusakan, hingga perpindahan tongkat estafet (Serah Terima BAST) tercatat utuh.

---

## ⚡ Arsitektur & Teknologi

Sistem SIAP dipecah menjadi 3 _layer_ tulang punggung:

1. **Layer 1: Backend API (Baja Murni)**
   - Node.js (Express) + TypeScript.
   - Prisma ORM dengan basis data **PostgreSQL**.
   - **Socket.io** (Pelacakan Waktu Nyata) & **Node-Cron** (Pekerja Belakang Layar).
   - Penyimpanan gambar absolut di **MinIO** (S3-Compatible) lengkap dengan cap air (_Watermark_).

2. **Layer 2: Mobile App (Ujung Tombak)**
   - **React Native 0.74** (CLI) dengan TypeScript.
   - Sinkronisasi luring (*Offline Sync*) dengan `op-sqlite` + `React Query`.
   - Kamera terintegrasi (*React Native Vision Camera*).

3. **Layer 3: Web Admin (Pusat Komando)**
   - **React 18** + Vite + TypeScript.
   - Navigasi file-based oleh **TanStack Router**.
   - Antarmuka Monokrom Ekstrem via **TailwindCSS** + **Shadcn/UI**.
   - Peta Radar Mini dari **Leaflet.js**.

---

## 🛠️ Panduan Menghidupkan Mesin (Local Development)

Ikuti langkah-langkah di bawah ini untuk memulai seluruh infrastruktur SIAP dari Titik Nol (0).

### 1. Bangun Infrastruktur Dasar (Docker)
Pastikan Docker Desktop sudah menyala di perangkat Anda.
```bash
cd infra
docker-compose up -d
```
> _Mesin Database (PostgreSQL) dan Gudang File (MinIO) kini berjalan diam-diam di latar belakang._

### 2. Nyalakan Mesin Utama (Backend)
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```
> _Server kini bersenandung di port `3000`._

### 3. Aktifkan Pusat Komando (Web Admin)
Buka terminal baru:
```bash
cd web-admin
npm install
npm run dev
```
> _Layar Monitor Radar Admin menyala di `http://localhost:5173`._

### 4. Terjunkan Pasukan Lapangan (Mobile App)
Buka terminal baru:
```bash
cd mobile
npm install --legacy-peer-deps
npm run android
```
> _Pastikan Emulator Android menyala, atau sambungkan Perangkat Nyata (Physical Device) Anda melalui kabel USB._

---

## 🛡️ Aturan Desain (Nike-Style/Brutalism)

Seluruh antarmuka tunduk pada kode etik desain absolut:
- **PALET**: Murni `#111111` (Hitam Pekat) dan `#ffffff` (Putih Bersih). Tidak ada abu-abu kompromi (kecuali batas minor).
- **TEKS**: `UPPERCASE` (Huruf Kapital) untuk semua aksi, label, dan peringatan. Menggunakan _font_ tebal (Black/Bold).
- **BENTUK**: Bersudut tajam. Dilarang keras menggunakan `border-radius`.
- **EFEK**: Bayangan solid keras (`shadow-[4px_4px_0_0_#111111]`), menolak keras efek kabur/transparan halus.

---

## 📜 Hak Cipta & Kepatuhan
Dikembangkan secara eksklusif untuk kebutuhan operasional manajemen gedung. 
**BOTAP TEKNOLOGI CERDAS DEV** © 2026. All rights reserved.

---

## 🚀 Misi Produksi (Deployment ke NevaCloud)

Aplikasi SIAP dilengkapi dengan **GitHub Actions** yang akan otomatis men-deploy ulang server setiap kali ada kode yang di-_push_ ke cabang `main`.

1. Masuk ke Repository GitHub Anda: `Settings` -> `Secrets and variables` -> `Actions`.
2. Tambahkan 3 rahasia (_Secrets_) berikut:
   - `NEVACLOUD_HOST`: Alamat IP Publik VPS Anda (misal: `103.24.xx.xx`).
   - `NEVACLOUD_USERNAME`: Nama pengguna VPS (biasanya `root`).
   - `NEVACLOUD_SSH_KEY`: Isi dengan _Private Key_ RSA dari VPS Anda (berawalan `-----BEGIN RSA PRIVATE KEY-----`).
3. Lakukan `git push origin main`. GitHub akan otomatis terhubung ke VPS Anda, mem-build _Web Admin_, dan me-restart _Docker Compose_ produksi!

---

## 🗄️ Protokol Penyelamatan Data (Backup & Restore)

### Cara Backup Otomatis
Jalankan berkas `infra/backup.sh` di dalam VPS Anda:
```bash
cd /opt/siap-app/infra
chmod +x backup.sh
./backup.sh
```
> Berkas ini akan menghasilkan `siap_db_backup_[TANGGAL].sql.gz` di folder `infra/backups/`. Anda bisa menggunakan `crontab -e` di VPS Anda untuk menjalankannya setiap malam.

### Cara Restore (Pemulihan)
Jika terjadi insiden dan Anda harus mengembalikan data dari file _backup_:
```bash
gunzip -c infra/backups/siap_db_backup_2026xxx.sql.gz | docker exec -i infra-postgres-1 psql -U siap_user -d siap_db
```

---

## 🔑 Update Sandi Firebase Cloud Messaging (FCM)

Jika sertifikat JSON (_Service Account_) FCM dari Firebase kedaluwarsa atau harus diganti:
1. Unduh _Private Key_ JSON baru dari Firebase Console (Pengaturan Proyek > Akun Layanan).
2. Tumpuk (Gantikan) file lama yang ada di `backend/firebase-service-account.json`.
3. Restart backend Anda (Jika di VPS, GitHub Actions akan merestartnya secara otomatis jika Anda mem-_push_ pergantian file ini, atau jalankan `docker-compose -f docker-compose.prod.yml restart backend`).
