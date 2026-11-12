# Seed & Fixture Strategy — SIAP

## Fixture inventory

Skrip seed deterministik dan idempoten tersedia di `backend/prisma/seed.ts` (dijalankan melalui `npm run prisma:seed` di folder `backend/`). Semua data pada seed ini adalah **data sintetis untuk development dan pengujian**, bukan data produksi nyata.

| Kategori Fixture | Isi / Identitas Sintetis | Sumber Bukti |
| --- | --- | --- |
| Area Tugas (3 lokasi Jakarta dummy, radius `50000` m untuk dev) | `area-kantor-pusat` (Kantor Pusat), `area-gudang-utama` (Gudang Utama), `area-lobby-utama` (Lobby Utama) | `backend/prisma/seed.ts#L12-L49` |
| Akun `ADMIN` (1 akun) | NIK `00001` — `Administrator SIAP` (`MANAJEMEN`) | `backend/prisma/seed.ts#L62-L74` |
| Akun `SATPAM` (2 akun) | NIK `11001` — `Budi Santoso`, NIK `11002` — `Agus Prasetyo` (`KEAMANAN`) | `backend/prisma/seed.ts#L80-L100` |
| Akun `CS` (2 akun) | NIK `12001` — `Dewi Rahayu`, NIK `12002` — `Sari Wulandari` (`CUSTOMER_SERVICE`) | `backend/prisma/seed.ts#L105-L125` |
| Akun `UTILITY` (2 akun) | NIK `13001` — `Hendra Wijaya`, NIK `13002` — `Rudi Hartono` (`UTILITY`) | `backend/prisma/seed.ts#L130-L150` |

## Safety and repeatability

- **Idempotensi:** `seed.ts` menggunakan `prisma.areaTugas.upsert` dan `prisma.staff.upsert`, sehingga aman dijalankan berulang kali tanpa menduplikasi data atau menimpa perubahan password staff yang sudah ada (`update: {}` pada `staff.upsert`).
- **Pemisahan Lingkungan & Radius Dev:**
  - `seed.ts` menyetel `radius_meter: 50000` (50 km) agar pengembang mudah menguji absensi dari emulator/perangkat lokal. Nilai ini **tidak aman untuk produksi** dan harus disesuaikan melalui menu Pengaturan Web Admin (`UI-009`) atau dibuatkan seed produksi terpisah.
  - Password dummy pada `seed.ts` di-hash dengan `bcrypt.hash(..., 12)`. Jangan pernah menjalankan `prisma:seed` dev di basis data produksi tanpa mengganti password admin bawaan.
  - Untuk pengujian otomatis (`backend/tests/setup.ts`), database uji terpisah `siap_test_db` dijalankan melalui `backend/.env.test` (berpedoman pada `backend/.env.test.example` berisi nilai sintetis) dan pengaman yang memastikan `DATABASE_URL` mengandung kata `test`.

## Not applicable or unresolved

- **Observed (Telah Diperbarui pada M4):** `backend/prisma/seed.ts` kini juga meng-upsert singleton `PengaturanSistem` (`id: 'singleton'`, `toleransi_keterlambatan_menit: 15`) secara idempoten bersama 3 `AreaTugas` dan 7 akun `Staff` sintetis.
- **Not applicable — Dataset Evaluasi AI**: Tidak ada fixture prompt/evaluasi AI karena `features.ai = false`.

