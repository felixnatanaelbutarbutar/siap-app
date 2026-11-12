# Audit Methodology — SIAP

## Audit states

Status kesiapan suite dokumentasi dan proyek SIAP ditetapkan berdasarkan salah satu dari empat status berikut:

| Status | Kriteria | Arti Operasional |
| --- | --- | --- |
| **PASS** | Nol temuan error/warning pada seluruh pemeriksaan mekanis yang dijalankan, dan ulasan manusia terhadap sumber kode terpenuhi | Dokumentasi konsisten terhadap bukti kode aktual; tetap memerlukan validasi rilis sebelum produksi |
| **PASS_WITH_WARNINGS** | Tidak ada hard fail mekanis pada struktur dokumen, namun ada peringatan (mis. ID belum terhubung penuh, bukti belum dijalankan, atau gap desain terbuka) | Suite dokumentasi lengkap dan jujur secara struktur, namun masih ada item tinjauan atau pengujian yang perlu ditindaklanjuti |
| **BLOCKED** | Fakta atau keputusan penting tidak tersedia sehingga keputusan kesiapan tidak dapat dibuat | Diperlukan klarifikasi atau persetujuan pemilik proyek terlebih dahulu |
| **FAIL** | Terkonfirmasi adanya minimal satu kondisi hard fail | Dokumentasi tidak valid atau menyesatkan dan wajib diperbaiki sebelum digunakan |

## Scoring rubric

Penilaian audit mekanis berjumlah total **100 poin** yang terbagi ke dalam tujuh kategori (tidak ada redistribusi bobot untuk kategori `N/A — alasan`):

| Kategori | Bobot | Fokus Penilaian |
| --- | --- | --- |
| Kelengkapan struktural (`structural completeness`) | 15 | Keberadaan tepat 21 dokumen kanonik pada `docs/` beserta seluruh heading wajib dan format konfigurasi valid |
| Bukti dan anti-halusinasi (`evidence and anti-hallucination`) | 20 | Klaim teknis disertai bukti file/baris nyata, bebas teks pengisi kosong, dan tidak memalsukan hasil tes/rilis |
| Koherensi kontrak dan skema (`contract/schema coherence`) | 15 | Konsistensi antara `DATA_MODEL.md`, `VALIDATION_RULES.md`, `API_CONTRACT.md`, dan kode aktual (atau tercatat eksplisit sebagai gap) |
| Keterlacakan (`traceability`) | 20 | Setiap ID kanonik (`REQ`, `NFR`, `US`, `ADR`, `MODEL`, `EP`, `UI`, `FLOW`, `TC`) didefinisikan satu kali dan terhubung tanpa tautan putus atau duplikasi |
| Keamanan dan kebersihan rahasia (`security and secret hygiene`) | 15 | Tidak ada kredensial/token/kunci privat bocor dalam dokumen serta cakupan model ancaman, RBAC/IDOR, dan batas upload |
| Kegunaan, operasi, dan aksesibilitas (`usability/operations/accessibility`) | 10 | Kesesuaian token UI/UX, alur pemulihan error, runbook operasi lokal/produksi, dan kejelasan strategi seed/uji |
| Kebersihan perubahan (`change hygiene`) | 5 | Pencatatan riwayat perubahan pada `_CHANGELOG.md` dengan stempel waktu UTC riil dan snapshot sumber terkini |

> Skor tinggi maupun kelengkapan 21 file **tidak** berarti aplikasi SIAP siap produksi; kesiapan rilis aplikasi bergantung pada penyelesaian milestone pada [IMPLEMENTATION.md](IMPLEMENTATION.md) dan eksekusi kasus uji pada [TESTING.md](TESTING.md).

## Hard fails

Kondisi berikut otomatis menggagalkan audit (`FAIL`):

1. **Dokumen kanonik hilang atau file ekstra ilegal:** Jumlah/nama file di `docs/` tidak sesuai manifes 21 dokumen kanonik.
2. **Rahasia terekspos (`secret exposure`):** Ditemukannya isi `.env`, kredensial Firebase/MinIO/JWT riil, atau private key di dalam dokumentasi.
3. **Klaim verifikasi palsu (`fabricated claim`):** Menyatakan tes lulus, aplikasi sudah ter-deploy sukses, atau siap produksi tanpa bukti eksekusi nyata.
4. **Kegagalan integritas ID kritis:** Ditemukannya ID duplikat lintas dokumen, ID yatim/menggantung (`dangling`/`orphaned`) tanpa pemetaan yang dapat dipertanggungjawabkan, atau tautan internal rusak.
5. **Penanda belum lengkap:** Keberadaan penanda rumpang kerja atau penanda tidak berlaku tanpa alasan eksplisit (`N/A — alasan eksplisit`).
6. **Perintah rusak atau mutasi kode tanpa izin:** Perintah wajib tidak sesuai kenyataan repo atau dokumen mendeskripsikan desain produksi seolah-olah fakta yang sudah terpasang.

## Human review

Pemeriksaan skrip mekanis hanya memverifikasi nama file, heading wajib, tautan internal, pola rahasia, integritas ID, alasan pengecualian (`N/A — alasan`), dan kecurigaan klaim tanpa bukti. Aspek berikut **wajib** ditinjau secara langsung oleh engineer atau pemilik proyek terhadap kode sumber aktual:

- Kesesuaian teknis solusi usulan di [IMPLEMENTATION.md](IMPLEMENTATION.md) (Milestones M1–M4) dan persetujuan atas **ADR-005** serta **ADR-006**.
- Penentuan kebijakan interval `LaporanPerJam` (1 jam vs 3 jam) dan konsolidasi tema UI pada `web-admin` dan `mobile`.
- Kecukupan mitigasi keamanan pada [SECURITY.md](SECURITY.md) sebelum aplikasi dibuka ke jaringan publik.
- Validitas alur uji manual dan otomatis pada [TESTING.md](TESTING.md) dan [ACCEPTANCE.md](ACCEPTANCE.md) setelah test suite diperbaiki.
