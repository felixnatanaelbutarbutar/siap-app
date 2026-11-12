# Visual Design System & UI Inventory — SIAP

## Current interface evidence

Aplikasi memiliki dua permukaan UI terpadu yang telah ditetapkan secara resmi oleh pemilik proyek (**ADR-006**):
1. **Web Admin (`web-admin/`)**: Mengimplementasikan tema gelap terinspirasi Spotify (`DESIGN.md` & `web-admin/src/index.css`) dengan mode terang opsional di `AdminLayout.tsx`, warna aksen `#1ed760` (dark) / `#1db954` (light), font `Inter`, sidebar responsif `w-60` + drawer mobile, rute 404 (`NotFoundPage.tsx`), dan ikon `lucide-react`.
2. **Mobile App (`mobile/`)**: Mengimplementasikan tema terang hijau-putih `SIAP Professional Mobility` (`DESIGN_MOBILE.md`, `mobile/src/navigation/AppNavigator.tsx`, `mobile/App.tsx`) dengan warna utama `#006e2f`, latar lembut `#f3fcef`/`#ffffff`, ikon `MaterialCommunityIcons`, serta tanpa sisa warna brutalisme `#111111`.
3. **Konsistensi Dokumentasi:** `README.md` root, `web-admin/index.html` (judul `SIAP — Admin Dashboard`), `mobile/App.tsx`, serta penghapusan `web-admin/src/App.tsx`, `temp-admin/`, dan `temp_mobile/` telah diselesaikan pada Milestone M2–M4.

| ID | Layar / Route | Platform | Sumber Bukti |
| --- | --- | --- | --- |
| **UI-001** | `/login` (`LoginPage`) | Web Admin | `web-admin/src/routes/login.tsx` |
| **UI-002** | `/dashboard` (`DashboardPage`) | Web Admin | `web-admin/src/routes/_authenticated/dashboard.tsx` |
| **UI-003** | `/absensi` (`AbsensiPage`) | Web Admin | `web-admin/src/routes/_authenticated/absensi.tsx` |
| **UI-004** | `/laporan` (`LaporanPage`) | Web Admin | `web-admin/src/routes/_authenticated/laporan.tsx` |
| **UI-005** | `/serah-terima` (`SerahTerimaPage`) | Web Admin | `web-admin/src/routes/_authenticated/serah-terima.tsx` |
| **UI-006** | `/izin-cuti` (`IzinCutiPage`) | Web Admin | `web-admin/src/routes/_authenticated/izin-cuti.tsx` |
| **UI-007** | `/staff` (`StaffPage`) | Web Admin | `web-admin/src/routes/_authenticated/staff.tsx` |
| **UI-008** | `/jadwal`, `/jadwal/$staffId`, `/kalender` | Web Admin | `web-admin/src/routes/_authenticated/jadwal*.tsx`, `kalender.tsx` |
| **UI-009** | `/pengumuman` & `/pengaturan` | Web Admin | `web-admin/src/routes/_authenticated/pengumuman.tsx`, `pengaturan.tsx` |
| **UI-010** | `LoginScreen` | Mobile | `mobile/src/screens/auth/LoginScreen.tsx` |
| **UI-011** | `BerandaScreen` | Mobile | `mobile/src/screens/main/BerandaScreen.tsx` |
| **UI-012** | `AbsensiScreen` & `CameraView` | Mobile | `mobile/src/screens/main/AbsensiScreen.tsx`, `mobile/src/components/CameraView.tsx` |
| **UI-013** | `ListLaporanScreen`, `BuatLaporanScreen`, `DetailLaporanScreen` | Mobile | `mobile/src/screens/laporan/` |
| **UI-014** | `LaporanPerJamScreen` (SATPAM only) | Mobile | `mobile/src/screens/laporan/LaporanPerJamScreen.tsx` |
| **UI-015** | `SerahTerimaScreen`, `KonfirmasiSerahTerimaScreen` (SATPAM & UTILITY) | Mobile | `mobile/src/screens/serahterima/` |
| **UI-016** | `IzinCutiScreen` & `ProfilScreen` | Mobile | `mobile/src/screens/main/IzinCutiScreen.tsx`, `mobile/src/screens/profil/ProfilScreen.tsx` |

## Design intent and constraints

- **Maksud Desain Web Admin (Observed):** Antarmuka pusat komando berdensitas tinggi dengan kontras gelap (`#121212` / `#181818`) agar peta live tracking, grafik kehadiran, dan badge status merah/kuning/hijau langsung menonjol untuk pemantauan harian admin.
- **Maksud Desain Mobile (Observed):** Antarmuka lapangan bercahaya terang (`#ffffff` / `#f3fcef`) dengan aksen hijau `#006e2f` dan target sentuh besar agar mudah dibaca di bawah cahaya luar ruang oleh satpam, CS, dan teknisi utilitas.
- **Catatan Konten Autentik:** Grafik bulanan pada `web-admin/src/routes/_authenticated/absensi.tsx` kini menggunakan data agregasi nyata `res.chart` dari backend (tanpa `Math.random()`); pada `login.tsx#L91`, statistik hero `"100+ Staff Aktif"` tetap bersifat ilustratif pemasaran di panel samping login.

## Design tokens

| Token | Nilai | Status | Sumber / Rasional |
| --- | --- | --- | --- |
| Web Dark Base (`--bg-base`) | `#121212` | Observed | `web-admin/src/index.css#L51` |
| Web Dark Surface (`--bg-surface`) | `#181818` | Observed | `web-admin/src/index.css#L52` |
| Web Dark Accent (`--accent`) | `#1ed760` | Observed | `web-admin/src/index.css#L60` (aksi utama & indikator live) |
| Web Semantic Error / Warning / Info | `#f3727f` / `#ffa42b` / `#539df5` | Observed | `web-admin/src/index.css#L65-L67` |
| Web Light Base / Accent | `#f5f5f7` / `#1db954` | Observed | `web-admin/src/index.css#L10-L19` |
| Mobile Primary (`AppNavigator.tsx` & `App.tsx`) | `#006e2f` | Observed | `DESIGN_MOBILE.md#L19`, `mobile/App.tsx`, `AppNavigator.tsx#L43` |
| Mobile Surface (`DESIGN_MOBILE.md` & `App.tsx`) | `#f3fcef` / `#ffffff` | Observed | `DESIGN_MOBILE.md#L4-L7`, `mobile/App.tsx` |
| Typography Web & Mobile | `Inter` (Web CSS), sistem default (Mobile) | Observed | `web-admin/src/index.css#L97`, `DESIGN_MOBILE.md#L53` |

## Layout, components and iconography

- **Web Admin:** Sidebar kiri `240px` (`w-60`) tetap pada viewport `>= md` dengan drawer geser responsif + top-bar mobile untuk `< md` (`AdminLayout.tsx`), rute fallback 404 (`NotFoundPage.tsx`), ikon `lucide-react` 18px konsisten, peta Leaflet (`CartoDB dark_all` di `dashboard.tsx`), dan grafik Recharts berbasis data riil.
- **Mobile:** Bottom Tab Navigator 4–5 tab (tab `Per 3 Jam` bersyarat hanya `SATPAM`) menggunakan `MaterialCommunityIcons`; layar `SerahTerimaScreen` dan `KonfirmasiSerahTerimaScreen` disajikan sebagai modal stack; layar `IzinCuti` sebagai route stack global.
- **Penggunaan Ikon:** Ikon hanya dipakai dari `lucide-react` (Web) dan `MaterialCommunityIcons` (Mobile); string teks pesan notifikasi push backend di `notification.service.ts`/`laporan.controller.ts` tetap mempertahankan karakter informatif.

## Component and state rules

- **Loading & Empty States:** Mobile menyediakan komponen `Skeleton.tsx` dan `EmptyState.tsx`; Web Admin memakai spinner atau `animate-pulse` di `dashboard.tsx` dan pesan tabel kosong di masing-masing halaman.
- **Error Boundary & 404:** Mobile membungkus root dengan `ErrorBoundary.tsx` dan `react-native-toast-message`; Web Admin memiliki `NotFoundPage.tsx` terpasang sebagai `notFoundComponent` di TanStack Router (`web-admin/src/main.tsx`).
- **Aksi Destruktif & Konfirmasi:** Logout di Web Admin memakai `ConfirmModal.tsx`; persetujuan izin dan laporan dilakukan via panel detail atau modal.

## Visual review checklist

Status verifikasi visual: Web Admin telah terverifikasi secara build (`npm run lint --max-warnings 0` & `tsc && vite build` lulus) dan dev server berjalan di `http://localhost:5173/`; inspeksi interaktif di emulator Android (`mobile/`) berstatus **Not run** pada lingkungan Windows tanpa emulator aktif.
- [ ] Periksa kontras teks dim (`--text-dim: #6d6d6d` di `#181818`) terhadap standar WCAG AA pada Web Admin dalam browser interaktif.
- [x] Sidebar Web Admin `AdminLayout.tsx` kini responsif pada viewport `< 768px` (top-bar mobile + drawer `md:translate-x-0`).
- [ ] Periksa render `AbsensiScreen`, `LaporanPerJamScreen`, dan `SerahTerimaScreen` pada emulator Android nyata.

## Not applicable or unresolved

- **Not run — Render Emulator Mobile:** Pengujian visual layar mobile pada perangkat/emulator Android belum dapat dijalankan dalam sesi ini.
- **Not applicable — Elemen UI Agent/Prompt:** Tidak ada antarmuka chat AI atau kontrol model generatif (`features.ai = false`).

