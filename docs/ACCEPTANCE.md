# Acceptance Criteria — SIAP

## User or operator jobs

| ID | Aktor | Pekerjaan Utama (Job to be Done) | Requirement Terkait |
| --- | --- | --- | --- |
| **US-001** | Semua Staff & Admin | Login aman dengan NIK/password serta pembatalan sesi saat logout | REQ-001, NFR-001 |
| **US-002** | Semua Staff & Admin | Mengakses menu & endpoint sesuai role masing-masing | REQ-002 |
| **US-003** | Staff Lapangan (`SATPAM`, `CS`, `UTILITY`) | Melakukan absensi masuk, istirahat, dan keluar dengan foto watermark dan GPS valid | REQ-003, NFR-002 |
| **US-004** | Staff Lapangan (`SATPAM`, `CS`, `UTILITY`) | Menyimpan absensi saat luring dan menyinkronkannya otomatis saat online | REQ-004 |
| **US-005** | Staff Lapangan (`SATPAM`, `CS`, `UTILITY`) | Membuat, menyunting draft, dan memantau status review laporan harian sesuai divisi | REQ-005 |
| **US-006** | `SATPAM` | Mengirim laporan keamanan per jam saat shift aktif dan menerima reminder berkala | REQ-006, REQ-012 |
| **US-007** | `SATPAM` & `UTILITY` | Memulai serah terima piket/peralatan, mengonfirmasi penerimaan, dan mengunduh BAST PDF | REQ-007 |
| **US-008** | Staff Lapangan & `ADMIN` | Mengajukan izin/cuti dengan lampiran opsional dan memproses persetujuannya | REQ-010 |
| **US-009** | `ADMIN` | Memantau ringkasan kehadiran, grafik 7 hari, aktivitas, dan live tracking peta real-time | REQ-008 |
| **US-010** | `ADMIN` | Mengaudit absensi harian, rekap statistik bulanan, dan mengekspor CSV | REQ-009 |
| **US-011** | `ADMIN` | Mengelola master staff, area tugas, jadwal shift, toleransi keterlambatan, dan pengumuman | REQ-011 |
| **US-012** | `ADMIN` | Mengirim broadcast notifikasi push ke semua staff, divisi, atau role tertentu | REQ-012 |

## Acceptance cases

- **US-001**: *Given* akun staff aktif dengan NIK dan password valid, *When* pengguna mengirim `POST /auth/login` lalu `POST /auth/logout`, *Then* token JWT diterbitkan dengan `jti` dan setelah logout token yang sama wajib ditolak (`401 TOKEN_REVOKED`). *Negative:* password salah mengembalikan `401` dan melebihi 5 percobaan per 10 menit mengembalikan `429`.
- **US-002**: *Given* pengguna login sebagai `CS`, *When* mengakses tab aplikasi mobile atau endpoint `/laporan/perjam` dan `/admin/*`, *Then* tab `Per 3 Jam` dan menu `Serah Terima` tidak ditampilkan di mobile dan server mengembalikan `403 FORBIDDEN`.
- **US-003**: *Given* staff berada dalam radius `AreaTugas` dengan `akurasi_gps <= 50` m, *When* mengirim foto absen masuk, *Then* foto di-watermark dan diunggah ke MinIO serta record `MASUK` tersimpan. *Negative:* jarak melebihi radius ditolak `400 GPS_VALIDATION_FAILED` dengan pesan jarak aktual; absen masuk kedua di hari yang sama ditolak.
- **US-004**: *Given* perangkat mobile terputus dari jaringan internet, *When* staff menekan absen masuk, *Then* data tersimpan di SQLite `absensi_offline` dengan banner tertunda dan otomatis terkirim ke endpoint `/absensi/masuk` saat online. *Negative:* error validasi `400` dari server tidak boleh masuk ke antrean offline.
- **US-005**: *Given* staff `CS` membuat laporan harian, *When* memilih kategori `KOMPLAIN`, *Then* laporan berstatus `SUBMITTED` tersimpan dan admin menerima notifikasi; jika memilih kategori milik `KEAMANAN` seperti `PATROLI`, server menolak dengan `400`.
- **US-006**: *Given* `SATPAM` sedang aktif shift (sudah masuk, belum keluar), *When* mengirim laporan per jam untuk pukul tertentu beserta foto, *Then* record `LaporanPerJam` tersimpan. *Negative:* pengiriman kedua pada jam yang sama di hari yang sama ditolak `400`.
- **US-007**: *Given* `SATPAM` memulai serah terima `PIKET` ke sesama `SATPAM`, *When* penerima menandatangani konfirmasi, *Then* status berubah `SELESAI`, file BAST PDF berisi tanda tangan kedua pihak tersimpan di MinIO, dan dapat diunduh melalui `/serah-terima/:id/bast`. *Negative:* pihak ketiga di luar penyerah/penerima/admin tidak boleh mengunduh BAST.
- **US-008**: *Given* staff mengirim pengajuan `SAKIT` melalui `/izin`, *When* admin membuka menu Izin & Cuti dan menyetujui/menolak pengajuan, *Then* status berubah ke `APPROVED`/`REJECTED` tanpa error server baik di mode dev maupun `NODE_ENV=production`.
- **US-009**: *Given* admin membuka `/dashboard`, *When* staff lapangan mengirim `location:update` via Socket.io atau melakukan absensi/laporan baru, *Then* peta dan feed aktivitas diperbarui secara real-time tanpa refresh manual.
- **US-010**: *Given* admin membuka `/absensi` tab Rekap Bulanan, *When* memilih bulan, tahun, dan divisi, *Then* grafik dan tabel menampilkan agregasi data nyata (bukan `Math.random()`) dan tombol Export CSV mengunduh berkas CSV yang valid.
- **US-011**: *Given* admin membuka `/staff`, `/jadwal`, dan `/pengaturan`, *When* menambah staff, mengatur jadwal harian, atau mengubah area tugas dan toleransi keterlambatan, *Then* data tervalidasi oleh Zod dan tersimpan ke PostgreSQL.
- **US-012**: *Given* admin mengirim broadcast melalui `/admin/notifikasi/broadcast`, *When* memilih target divisi/role/semua, *Then* `sendToDivisi`/`sendToRole`/`sendMulticast` dipanggil untuk seluruh token FCM aktif pada target.

## Sign-off and readiness

Status penerimaan saat ini (**Observed Pasca-Eksekusi M1–M4**):
- **Backend API & Web Admin:** Seluruh celah fungsional/keamanan (**US-001..US-012**) telah diimplementasikan dan terverifikasi secara build, linter, serta `4/4` suite uji integrasi backend (`16/16` tes lulus terhadap `siap_test_db` pada [TESTING.md](TESTING.md)).
- **Mobile & Infrastruktur Produksi:** Sinkronisasi offline **US-004**, payload serah terima **US-007**, tema **ADR-006**, serta konfigurasi Docker/Nginx produksi sudah diselaraskan secara kode dan lolos ESLint (`0` errors); tersisa verifikasi interaktif pada emulator Android, aktivasi TLS Nginx, dan penetapan baseline beban **NFR-005** sebelum rilis VPS publik.

