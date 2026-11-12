# User Journeys & UX Patterns — SIAP

## Users and tasks

- **SATPAM (Mobile):** Masuk aplikasi -> Absen Masuk (GPS + Kamera) -> Isi Laporan Per 3 Jam -> Buat Laporan Harian -> Mulai/Konfirmasi Serah Terima Piket -> Pengajuan Izin/Cuti -> Absen Keluar.
- **CS (Mobile):** Masuk aplikasi -> Absen Masuk (GPS + Kamera) -> Buat Laporan Pelayanan -> Pengajuan Izin/Cuti -> Absen Keluar.
- **UTILITY (Mobile):** Masuk aplikasi -> Absen Masuk (GPS + Kamera) -> Buat Laporan Pemeliharaan/Kerusakan -> Mulai/Konfirmasi Serah Terima Peralatan -> Pengajuan Izin/Cuti -> Absen Keluar.
- **ADMIN (Web):** Login -> Pantau Live Dashboard -> Audit Absensi & Ekspor CSV -> Review Laporan -> Tinjau Serah Terima & Inventaris Bermasalah -> Setujui/Tolak Izin & Cuti -> Kelola Staff, Jadwal Kerja, Pengumuman, dan Pengaturan Area/Toleransi.

## Journey flows

| ID | Alur Pengguna | Platform | Sumber Bukti |
| --- | --- | --- | --- |
| **FLOW-001** | Login NIK/Password & Biometrik (Mobile) / Login Admin (Web) | Mobile & Web | `mobile/src/screens/auth/LoginScreen.tsx`, `web-admin/src/routes/login.tsx` |
| **FLOW-002** | Absen Masuk / Istirahat / Keluar dengan Kamera & Validasi GPS | Mobile | `mobile/src/screens/main/AbsensiScreen.tsx`, `CameraView.tsx` |
| **FLOW-003** | Antrean & Sinkronisasi Offline Absensi saat Koneksi Kembali | Mobile | `mobile/src/components/NetworkManager.tsx`, `database.ts` |
| **FLOW-004** | Pembuatan, Penyuntingan Draft, dan Peninjauan Detail Laporan Harian | Mobile | `mobile/src/screens/laporan/BuatLaporanScreen.tsx`, `ListLaporanScreen.tsx` |
| **FLOW-005** | Pelaporan Keamanan Per Jam & Pengingat Lokal Notifee | Mobile (SATPAM) | `mobile/src/screens/laporan/LaporanPerJamScreen.tsx` |
| **FLOW-006** | Pembuatan & Konfirmasi Serah Terima + Preview/Share BAST PDF | Mobile (SATPAM & UTILITY) | `mobile/src/screens/serahterima/` |
| **FLOW-007** | Pengajuan Izin/Cuti/Sakit dengan Lampiran Bukti | Mobile | `mobile/src/screens/main/IzinCutiScreen.tsx` |
| **FLOW-008** | Pemantauan Ringkasan Divisi, Grafik 7 Hari, & Live Tracking Peta | Web Admin | `web-admin/src/routes/_authenticated/dashboard.tsx` |
| **FLOW-009** | Audit Absensi Harian, Statistik Bulanan, & Ekspor CSV | Web Admin | `web-admin/src/routes/_authenticated/absensi.tsx` |
| **FLOW-010** | Review Laporan Harian & Timeline Gap Laporan Per Jam Satpam | Web Admin | `web-admin/src/routes/_authenticated/laporan.tsx` |
| **FLOW-011** | Review Izin & Cuti serta Tinjauan Serah Terima / Inventaris Bermasalah | Web Admin | `web-admin/src/routes/_authenticated/izin-cuti.tsx`, `serah-terima.tsx` |
| **FLOW-012** | Manajemen Master Staff, Area Tugas (Peta), Jadwal Shift, Pengumuman | Web Admin | `web-admin/src/routes/_authenticated/staff.tsx`, `jadwal.tsx`, `pengaturan.tsx`, `pengumuman.tsx` |

## Form placement and overlays

Penempatan formulir yang terobservasi di kode saat ini:
- **Formulir Halaman Penuh (Sesuai Pedoman):** Login Web (`login.tsx`), Login Mobile (`LoginScreen.tsx`), Buat Laporan Mobile (`BuatLaporanScreen.tsx`), Laporan Per Jam (`LaporanPerJamScreen.tsx`), dan Pengaturan Toleransi (`pengaturan.tsx`).
- **Formulir dalam Modal / Slide-over (Observed Deviation dari Pedoman Page-First):**
  - `izin-cuti.tsx` membuka detail & form review `APPROVED`/`REJECTED` di dalam overlay modal (`fixed inset-0`).
  - `laporan.tsx` membuka detail & form review di slide-over panel (`Sheet`).
  - `staff.tsx`, `jadwal.tsx`, `pengumuman.tsx`, dan `pengaturan.tsx` (Area Tugas) menggunakan dialog/modal untuk tambah/edit data.
  - Di Mobile, `SerahTerimaScreen` dan `KonfirmasiSerahTerimaScreen` dibuka sebagai modal stack (`presentation: 'modal'`), serta kamera dibuka via `<Modal>` pada `AbsensiScreen.tsx`.
- **Rekomendasi UX (Proposed — approval required):** Pertahankan modal untuk konfirmasi singkat (`ConfirmModal.tsx`) dan detail ringkas, sementara form multi-field yang panjang (seperti tambah/edit Staff lengkap atau Area Tugas dengan peta) sebaiknya dipindahkan ke halaman/route khusus atau dipastikan memiliki manajemen fokus WAI-ARIA (`Escape`, focus trap, return focus, dan fallback penuh pada layar kecil).

## Interaction states

- **Loading:** Web Admin menggunakan skeleton pulse (`dashboard.tsx`) atau spinner inline (`izin-cuti.tsx`); Mobile memakai `Skeleton.tsx` dan `ActivityIndicator`.
- **Empty:** Web Admin menampilkan baris tabel kosong informatif (mis. `"Belum ada pengajuan izin/cuti."`); Mobile memakai `EmptyState.tsx`.
- **Offline / Error:** `NetworkManager.tsx` menampilkan banner kuning di atas layar saat ada `absensi_offline` tertunda; `AbsensiScreen.tsx` kini hanya memasukkan error kegagalan jaringan (`!error?.response`) ke SQLite sementara penolakan `4xx` server tetap langsung ditampilkan dan ditandai gagal oleh `markAbsensiFailed` (`database.ts`) agar tidak menyumbat antrean FIFO.
- **Serah Terima Mobile:** `SerahTerimaScreen.tsx` kini mengirim payload `POST /serah-terima/mulai` sesuai skema backend (`jenis`, `staff_baru_id`, `barang_list`, `ttd_lama`) dan `KonfirmasiSerahTerimaScreen.tsx` terhubung ke `GET /serah-terima/riwayat` serta `POST /serah-terima/:id/konfirmasi` (`{ ttd_baru }`).
- **Success:** Mobile memakai `Alert.alert` dan `Toast`; Web Admin memakai event `toast` / toaster.

## Accessibility and recovery

- **Label & Kontrol Formulir:** Input di `login.tsx` dan `izin-cuti.tsx` memiliki label visual jelas; beberapa modal custom (`izin-cuti.tsx#L119`) memakai `<div className="fixed inset-0">` tanpa atribut `role="dialog"`, `aria-modal="true"`, atau penangkap tombol `Escape`.
- **Pemulihan Kesalahan:** Pada `dashboard.tsx` tidak ada banner status terputus bila Socket.io gagal terhubung; pada `absensi.tsx#L100` kegagalan ekspor CSV masih memakai `alert('Gagal export CSV')` bawaan browser alih-alih komponen notifikasi terakses.
- **Verifikasi Aksesibilitas & Alur Interaktif:** **Not run** pada sesi ini.

