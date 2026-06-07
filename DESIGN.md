# Panduan Desain SIAP (Sistem Absensi & Pelaporan)

## 1. Konsep Utama (Modern, Clean & Accessible)
Aplikasi Web Admin SIAP menggunakan desain yang modern, bersih, profesional, dan sangat mengutamakan **aksesibilitas serta kemudahan penggunaan (usability)**. Desain lama yang bersifat brutalist telah digantikan.

### Prinsip Aksesibilitas
*   **Hierarki Visual yang Baik:** Gunakan ukuran font yang berbeda untuk membedakan judul, sub-judul, dan body text.
*   **Kontras Warna Tinggi:** Pastikan teks selalu mudah dibaca. Gunakan `text-slate-900` untuk teks utama dan `text-slate-600` untuk teks sekunder di atas latar belakang terang.
*   **Legibility (Keterbacaan):** Font utama adalah `Inter`. Hindari penggunaan huruf kapital semua (ALL-CAPS) untuk kalimat panjang atau body text, gunakan hanya untuk label pendek jika diperlukan.
*   **CTA Menari dan Jelas (Prominent CTA):** Tombol aksi utama (Simpan, Tambah, Setujui) harus memiliki warna solid yang kontras (seperti `bg-indigo-600 text-white`) dengan ukuran area klik (touch target) yang besar (minimal padding `py-2.5` atau `py-3`), serta diberi efek hover dan shadow yang jelas.

## 2. Warna (Tailwind CSS)
*   **Background Utama:** `bg-slate-50` atau `bg-background`
*   **Warna Primer (Aksen & CTA):** `indigo-600` (#4F46E5)
*   **Warna Sukses:** `emerald-600`
*   **Warna Peringatan:** `amber-500`
*   **Warna Bahaya/Error:** `red-600`
*   **Teks Utama:** `slate-900`
*   **Teks Sekunder/Label:** `slate-600` (hindari `slate-400` untuk teks berukuran kecil karena kontrasnya rendah)
*   **Border:** `slate-200`

## 3. Komponen UI
*   **Tombol Utama (CTA):** `bg-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-sm transition-colors`
*   **Tombol Sekunder:** `bg-white text-slate-700 border border-slate-300 px-4 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors`
*   **Card / Wadah Konten:** `bg-white rounded-2xl border border-slate-200 shadow-sm p-6`
*   **Tabel:** Header abu-abu terang (`bg-slate-50`), teks header `text-xs font-bold text-slate-700 uppercase`. Baris memiliki hover effect (`hover:bg-slate-50/50`).
*   **Badge / Status:** Berbentuk pil (pill-shaped) dengan background warna transparan dan teks tebal. Contoh: `bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium`.

## 4. Typography
*   **Heading 1 (Page Title):** `text-2xl font-bold text-slate-900`
*   **Heading 2 (Section Title):** `text-lg font-bold text-slate-900`
*   **Label Form:** `text-sm font-bold text-slate-700 mb-1.5`
*   **Body Text:** `text-sm text-slate-700`

## 5. Form & Input
*   **Input Field:** `border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`
*   Berikan jarak yang cukup (`space-y-4` atau `space-y-6`) antar elemen form agar mudah disentuh/diklik.

## 6. Iconography
Gunakan library ikon modern seperti **Lucide React** (`lucide-react`) untuk memberikan konteks visual yang cepat pada tombol, menu, atau status.
