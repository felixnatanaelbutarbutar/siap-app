<div align="center">
  <br />
  <img src="https://raw.githubusercontent.com/tanstack/router/main/media/repo-header.png" alt="SIAP Banner" width="100%" style="border-radius: 8px; filter: grayscale(100%);" />
  <br />
  <br />

  <h1 align="center">SIAP (Sistem Absensi & Pelaporan)</h1>
  
  <p align="center">
    <strong>Aplikasi Operasional Lintas Divisi (Satpam, CS, Utility) Terpadu</strong><br/>
    <em>Web Admin Dark Command Center & Aplikasi Mobile Lapangan Light High-Contrast.</em>
  </p>
  
  <br />
</div>

---

## 🛡️ Tentang SIAP

**SIAP** adalah ekosistem aplikasi terpadu (Mobile & Web) yang dirancang khusus untuk memenuhi standar disiplin operasional di lapangan, mencakup absensi geo-fencing + watermark, laporan rutin per 3 jam (khusus SATPAM), laporan harian per divisi, serah terima shift bertanda tangan digital (BAST PDF), perizinan, dan pemantauan live tracking.

Lihat dokumentasi arsitektur lengkap di [docs/README.md](docs/README.md).

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

### 💡 Cara Super Cepat (Khusus Pengembang di Windows)
Alih-alih menjalankan 4 perintah di atas satu persatu, Anda bisa mengklik ganda (*double-click*) file **`start-all.bat`** di folder utama proyek, atau jalankan perintah ini di terminal utama Anda:
```cmd
.\start-all.bat
```
> _Skrip ini akan secara otomatis membuka 3 jendela terminal baru (Backend, Web Admin, dan Mobile) sekaligus menyalakan Docker untuk Anda secara instan tanpa perlu repot!_

---

### 1. Bangun Infrastruktur Dasar (Docker - Cara Manual)
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

## 🎨 Sistem Desain Dual-Surface

- **Web Admin (`web-admin/`)**: Dark Command Center (`#121212` obsidian canvas, `#1ed760` hijau neon aksen status aktif) menggunakan React 18, TanStack Router, TailwindCSS, dan Leaflet.
- **Mobile App (`mobile/`)**: Light High-Contrast (`#f3fcef` latar terang lapangan, `#006e2f` hijau emerald aksen) menggunakan React Native 0.74 dan React Native Paper.

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
