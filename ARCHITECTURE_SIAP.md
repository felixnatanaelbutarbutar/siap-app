# ARCHITECTURE.md — SIAP (Sistem Absensi & Pelaporan)
> Aplikasi Mobile Operasional Satpam | BOTAP TEKNOLOGI CERDAS DEV
> Dirancang untuk **maksimal 100 karyawan** — simple, performa bagus, tidak over-engineered.

---

## Gambaran Arsitektur

```
┌──────────────────────────────┐     ┌─────────────────────────────┐
│     MOBILE APP (Satpam)      │     │   WEB ADMIN (Supervisor)    │
│   React Native 0.74 (TS)     │     │     Vite + React (TS)       │
└──────────────┬───────────────┘     └──────────────┬──────────────┘
               │                                    │
               └──────────────┬─────────────────────┘
                              │ HTTPS / WebSocket
               ┌──────────────▼─────────────────────┐
               │           BACKEND                   │
               │     Node.js 20 + Express (TS)       │
               └──────┬──────────────────┬───────────┘
                      │                  │
          ┌───────────▼──────┐  ┌────────▼────────────┐
          │   PostgreSQL 16  │  │   MinIO              │
          │   (data utama)   │  │   (foto & PDF)       │
          └──────────────────┘  │   @ NevaCloud VPS    │
                                └─────────────────────┘
```

> **Kenapa sesimpel ini?** 100 user maksimal. Peak load terjadi saat pergantian shift (~20–30 orang absen bersamaan). Tidak butuh Redis, message queue, atau multi-server. Satu VPS NevaCloud sudah cukup untuk semua komponen.

---

## 1. Mobile — Aplikasi Satpam

### Framework Utama

| Komponen | Pilihan | Versi |
|---|---|---|
| Framework | **React Native** | 0.74.x |
| Language | **TypeScript** | 5.x |
| Navigation | **React Navigation** | v6 |
| State Management | **Zustand** | 4.x |
| UI Components | **React Native Paper** | 5.x |

**Kenapa React Native?** Satu codebase untuk Android dan iOS. Ekosistem GPS/kamera/biometrik matang. Developer Indonesia lebih banyak familiar TypeScript dibanding Dart (Flutter).

| Alternatif | Alasan Ditolak |
|---|---|
| Flutter | Dart kurang familiar, ekosistem watermark custom lebih terbatas |
| Native Android/iOS | Butuh dua codebase — cost berlipat |
| Ionic / Capacitor | Performa lebih lambat untuk live camera dan GPS real-time |

---

### Library Mobile per Fitur

#### GPS & Lokasi
| Library | Versi | Fungsi |
|---|---|---|
| `react-native-geolocation-service` | 5.x | Ambil koordinat GPS akurat di Android 10+ dan iOS |
| `react-native-maps` | 1.x | Tampilkan peta area tugas |

`react-native-geolocation-service` dipilih karena library built-in React Native tidak akurat di Android 10+ dan tidak support background tracking. Library ini wrapper di atas `FusedLocationProviderClient` (Android) dan `CLLocationManager` (iOS).

#### Kamera & Watermark
| Library | Versi | Fungsi |
|---|---|---|
| `react-native-vision-camera` | 4.x | Live camera untuk foto absen dan dokumentasi laporan |
| `react-native-image-manipulator` | 1.x | Embed watermark teks ke foto (nama, waktu, koordinat GPS) |
| `@shopify/react-native-skia` | 1.x | Render watermark dengan font dan posisi presisi |

`react-native-camera` sudah deprecated sejak 2023 — tidak dipakai.

#### Keamanan & Anti-Cheat
| Library | Versi | Fungsi |
|---|---|---|
| `react-native-jailbreak-detector` | 2.x | Deteksi root (Android) dan jailbreak (iOS) |
| `react-native-mock-location-detector` | 1.x | Deteksi fake GPS / aplikasi spoofing lokasi |
| `react-native-biometrics` | 3.x | Autentikasi fingerprint dan Face ID |
| `react-native-encrypted-storage` | 4.x | Simpan JWT token dengan enkripsi AES-256 |

Deteksi fake GPS di perangkat hanya lapis pertama. Validasi utama tetap dilakukan server-side.

#### Offline & Sinkronisasi
| Library | Versi | Fungsi |
|---|---|---|
| `@op-engineering/op-sqlite` | 6.x | SQLite lokal — data tersimpan saat offline |
| `@tanstack/react-query` | 5.x | Background sync + retry otomatis saat koneksi pulih |
| `react-native-netinfo` | 11.x | Deteksi perubahan status koneksi |

**Strategi offline:**
1. Semua aksi (absen, laporan) tulis ke SQLite lokal dulu
2. `NetInfo` deteksi koneksi kembali → trigger sync
3. `react-query` retry dengan exponential backoff
4. Konflik diselesaikan dengan `server_timestamp` (last-write-wins)

#### Notifikasi
| Library | Versi | Fungsi |
|---|---|---|
| `@notifee/react-native` | 7.x | Notifikasi lokal terjadwal — pengingat laporan per jam |
| `@react-native-firebase/messaging` | 20.x | Push notification dari server (alert admin) |

#### Dokumen & Tanda Tangan
| Library | Versi | Fungsi |
|---|---|---|
| `react-native-pdf-lib` | 1.x | Generate BAST PDF di perangkat |
| `react-native-share` | 10.x | Simpan / share PDF ke penyimpanan lokal |
| `react-native-signature-canvas` | 4.x | Canvas tanda tangan digital untuk serah terima |

---

## 2. Web Admin — Dashboard Supervisor

### Framework Utama

| Komponen | Pilihan | Versi |
|---|---|---|
| Build Tool + Framework | **Vite + React** | Vite 5.x + React 18 |
| Language | **TypeScript** | 5.x |
| UI Components | **shadcn/ui** | latest |
| Tabel & Data Grid | **TanStack Table** | v8 |
| Charts / Statistik | **Recharts** | 2.x |
| Maps (live tracking) | **Leaflet + react-leaflet** | 4.x |
| HTTP Client | **Axios** | 1.x |
| State Management | **Zustand** | 4.x |

**Kenapa Vite + React, bukan Next.js?**
Dashboard admin tidak butuh SEO dan tidak ada halaman publik — SSR dari Next.js tidak ada manfaatnya di sini. Vite jauh lebih ringan dan cepat untuk SPA internal. Next.js lebih tepat kalau ada kebutuhan landing page atau SEO.

**Kenapa Leaflet bukan Google Maps?**
Leaflet open-source dan gratis tanpa API key berbayar. Untuk menampilkan posisi satpam di peta area tugas, Leaflet sudah lebih dari cukup.

---

## 3. Backend

### Framework & Runtime

| Komponen | Pilihan | Versi |
|---|---|---|
| Runtime | **Node.js** | 20.x LTS |
| Framework | **Express** | 4.x |
| Language | **TypeScript** | 5.x |
| Process Manager | **PM2** | 5.x |
| Real-time | **Socket.io** | 4.x |

**Kenapa tidak NestJS?** Terlalu opinionated dan berat untuk skala 100 user. Express lebih mudah dipahami, lebih cepat di-setup, dan sudah lebih dari cukup.

### Library Backend per Domain

#### Autentikasi & Keamanan
| Library | Versi | Fungsi |
|---|---|---|
| `jsonwebtoken` | 9.x | Generate & verifikasi JWT |
| `bcryptjs` | 2.x | Hash password sebelum disimpan |
| `helmet` | 7.x | Security headers HTTP |
| `express-rate-limit` | 7.x | Rate limiting login (memory store — cukup untuk 100 user) |
| `cors` | 2.x | Whitelist domain yang boleh akses API |

> **Kenapa tidak Redis untuk rate limiting?** Memory store `express-rate-limit` sudah cukup untuk 100 user. Redis baru diperlukan kalau backend jalan di beberapa server sekaligus (horizontal scaling) — yang tidak kita butuhkan di sini.

#### Validasi GPS Server-Side
| Library | Versi | Fungsi |
|---|---|---|
| `geolib` | 3.x | Hitung jarak koordinat satpam vs area tugas |
| `node-fetch` | 3.x | Reverse geocoding via OpenStreetMap Nominatim (gratis, tanpa API key) |

```
jarak = geolib.getDistance(koordinat_satpam, koordinat_area_tugas)
if jarak > radius_area (default 500m) → TOLAK absen
if timestamp GPS > 5 menit → TOLAK (GPS stale)
```

Geocoding menggunakan **OpenStreetMap Nominatim** — gratis, tidak butuh API key berbayar. Alternatif berbayar (Google Maps) tidak perlu untuk kebutuhan ini.

#### Image Processing
| Library | Versi | Fungsi |
|---|---|---|
| `sharp` | 0.33.x | Resize, kompres, dan embed watermark metadata ke foto |
| `exifr` | 7.x | Baca & verifikasi metadata EXIF foto (timestamp, GPS) |

#### PDF Generation
| Library | Versi | Fungsi |
|---|---|---|
| `pdfkit` | 0.15.x | Generate BAST PDF server-side |

#### Database ORM
| Library | Versi | Fungsi |
|---|---|---|
| `prisma` | 5.x | ORM PostgreSQL — type-safe, migration otomatis, Prisma Studio untuk debug |

#### Real-time (Live Tracking)
| Library | Versi | Fungsi |
|---|---|---|
| `socket.io` | 4.x | WebSocket untuk live tracking di dashboard admin |

```
Satpam kirim koordinat setiap 30 detik → Socket.io room per shift
Admin subscribe → update real-time tanpa polling
```

#### Validasi & Logging
| Library | Versi | Fungsi |
|---|---|---|
| `zod` | 3.x | Validasi schema semua request body |
| `winston` | 3.x | Structured logging ke file |
| `morgan` | 1.x | HTTP request logger |

---

## 4. Database

### PostgreSQL 16

Dipilih karena mendukung JSONB (untuk daftar barang serah terima yang fleksibel), ACID compliance (data absensi tidak boleh corrupt), dan bisa dijalankan di VPS yang sama dengan backend.

**Skema tabel utama:**
```
satpam          → id, nik, nama, password_hash, area_tugas_id, role
area_tugas      → id, nama, lat, lng, radius_meter
absensi         → id, satpam_id, jenis, foto_url, lat, lng, waktu_server
laporan         → id, satpam_id, jenis, judul, deskripsi, foto_urls[], status
laporan_perjam  → id, satpam_id, jam, status_keamanan, foto_url, catatan
serah_terima    → id, satpam_lama_id, satpam_baru_id, barang_list JSONB, bast_pdf_url
revoked_tokens  → id, token_jti, expired_at  ← pengganti Redis untuk JWT blacklist
```

> **Kenapa tidak Redis?** Dengan 100 user, tabel `revoked_tokens` di PostgreSQL hanya akan berisi ratusan baris. Query-nya sangat cepat. Redis baru masuk akal kalau ada jutaan token aktif.

---

## 5. File Storage — MinIO di NevaCloud

### Kenapa MinIO?

| Kriteria | MinIO | AWS S3 |
|---|---|---|
| Biaya | Gratis (self-hosted) | Bayar per GB + request |
| API | S3-compatible (kode sama persis) | S3 native |
| Kontrol data | Penuh — di VPS sendiri | Data di server AWS luar negeri |
| Migrasi ke S3 nanti | Tinggal ganti endpoint URL | — |
| Setup | Docker Compose, 5 menit | Butuh akun AWS, IAM, bucket policy |

MinIO menggunakan API yang 100% kompatibel dengan S3. Artinya kalau di masa depan ingin migrasi ke S3 atau provider lain, **tidak ada perubahan kode** — cukup ganti environment variable `STORAGE_ENDPOINT`.

**Struktur folder MinIO:**
```
bucket: siap-storage
├── absensi/{satpam_id}/{tanggal}/{timestamp}.jpg
├── laporan/{laporan_id}/{timestamp}.jpg
└── bast/{serah_terima_id}/bast.pdf
```

**Library koneksi:**
```
@aw    s-sdk/client-s3   v3.x   → SDK S3-compatible, bekerja langsung dengan MinIO
```

**Retention:** File dipertahankan minimum 2 tahun via MinIO lifecycle policy.

---

## 6. Infrastruktur — NevaCloud

### Spesifikasi VPS yang Direkomendasikan

Untuk 100 satpam dengan semua komponen di satu server:

| Spec | Minimum | Rekomendasi |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Bandwidth | 1 TB/bln | 2 TB/bln |

Estimasi storage foto: ~200 KB/foto × 5 foto/hari × 100 satpam × 365 hari × 2 tahun = **±73 GB** untuk 2 tahun data.

### Setup di VPS

```
VPS NevaCloud
├── Docker + Docker Compose
├── Nginx (reverse proxy + serve web admin)
├── Node.js Backend (container)
├── PostgreSQL 16 (container)
└── MinIO (container)
```

Semua komponen dijalankan dengan **Docker Compose** — mudah di-maintain, mudah di-backup, mudah di-restore.

### CI/CD

| Komponen | Pilihan | Cara Kerja |
|---|---|---|
| Source Control | **GitHub** | Push ke branch `main` → trigger deploy |
| CI/CD | **GitHub Actions** | Build image → SSH ke VPS → `docker compose up -d` |

Tidak butuh Kubernetes atau orchestration kompleks untuk skala ini.

---

## 7. Testing

| Layer | Library | Versi | Keterangan |
|---|---|---|---|
| Backend Unit | **Jest** | 29.x | Test validasi GPS, logika absensi |
| Backend Integration | **Supertest** | 6.x | Test endpoint API end-to-end |
| Mobile Component | **React Native Testing Library** | 12.x | Test komponen UI |

E2E testing (Detox) dimasukkan sebagai opsional di fase selanjutnya — terlalu berat untuk MVP.

---

## 8. Ringkasan Stack (Quick Reference)

```
MOBILE (Satpam)
├── React Native 0.74 + TypeScript
├── React Navigation v6
├── Zustand (state)
├── react-native-vision-camera (kamera)
├── react-native-geolocation-service (GPS)
├── react-native-image-manipulator + Skia (watermark)
├── op-sqlite (offline) + react-query (sync)
├── Notifee (notif lokal) + Firebase Messaging (push)
├── react-native-biometrics (fingerprint)
└── react-native-signature-canvas (tanda tangan)

WEB ADMIN (Supervisor)
├── Vite + React 18 + TypeScript
├── shadcn/ui (komponen)
├── TanStack Table (data grid)
├── Recharts (grafik statistik)
└── Leaflet (peta live tracking)

BACKEND
├── Node.js 20 LTS + Express + TypeScript
├── Prisma 5 + PostgreSQL 16
├── Socket.io 4 (live tracking)
├── Sharp (image processing)
├── PDFKit (generate BAST)
├── @aws-sdk/client-s3 → MinIO
└── Zod + Winston (validasi & logging)

INFRA
├── NevaCloud VPS (semua komponen)
├── MinIO (file storage, S3-compatible)
├── Docker + Docker Compose
├── Nginx (reverse proxy)
└── GitHub Actions (CI/CD)
```

---

## 9. Keputusan Arsitektur (ADR)

### ADR-01: Tidak Pakai Redis
100 user tidak membutuhkan Redis. Rate limiting cukup dengan memory store. JWT blacklist cukup dengan tabel PostgreSQL. Cache cukup dengan in-memory di Node.js. Redis baru dipertimbangkan jika user tumbuh di atas 1.000.

### ADR-02: Tidak Pakai Message Queue (BullMQ/RabbitMQ)
Peak load maksimal ~30 satpam absen bersamaan. Upload foto + generate PDF bisa dijalankan async biasa (`async/await`) tanpa queue formal. Queue baru diperlukan di atas ratusan job per detik.

### ADR-03: MinIO bukan AWS S3
Data tersimpan di VPS Indonesia (NevaCloud), tidak ada biaya storage bulanan, API 100% kompatibel dengan S3 sehingga migrasi ke S3 di masa depan tidak butuh perubahan kode.

### ADR-04: GPS Validation Dua Lapis
Validasi di perangkat (library) sebagai UX feedback awal. Validasi di server (`geolib`) sebagai sumber kebenaran. Deteksi di perangkat saja bisa di-bypass via APK modifikasi.

### ADR-05: Foto Watermark Dua Tahap
Watermark visual di perangkat untuk tampilan. Metadata EXIF ditanam ulang di server via `sharp` sebelum disimpan ke MinIO. Metadata server tidak bisa dihapus tanpa akses langsung ke storage.

### ADR-06: Vite + React bukan Next.js untuk Admin
Dashboard admin adalah SPA internal — tidak ada kebutuhan SEO atau halaman publik. Vite lebih ringan dan cepat di-setup. Next.js lebih tepat jika ada halaman publik atau kebutuhan SSR.
