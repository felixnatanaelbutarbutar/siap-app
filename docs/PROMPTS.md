# AI & Developer Prompts — SIAP

## Runtime AI inventory

**Not applicable — aplikasi SIAP tidak memiliki fitur LLM, chatbot, RAG, atau agent AI pada runtime (`features.ai = false`).** Seluruh fitur aplikasi (absensi GPS, watermark gambar, pelaporan, BAST PDF, Socket.io live tracking, dan pengingat cron FCM) berjalan secara deterministik di Node.js, React, dan React Native.

## Prompt and developer patterns

Meskipun tidak ada prompt runtime, repositori mendokumentasikan pola prompt pengembangan terstruktur di `TASKS_SIAP.md` (`TASK-00` s.d. `TASK-22`) untuk agen pengkodean, serta pedoman prompt UI di `DESIGN.md#L222-L246`.

Pola prompt yang direkomendasikan saat menugaskan pengembang/AI agent untuk menyelesaikan sisa bug SIAP:
1. **Perbaikan Kontrak Terikat Bukti:**
   - *"Periksa kontrak endpoint dan event Socket.io di `backend/src/` sebelum menyunting `web-admin/src/` atau `mobile/src/`. Jelaskan bukti file dan baris sebelum mengubah kode, lalu verifikasi dengan `tsc --noEmit` dan Jest."*
2. **Audit Keamanan Input & Otorisasi:**
   - *"Tinjau setiap route baru atau lama di `backend/src/routes/` untuk memastikan middleware `authenticate`, `requireRole`, validasi Zod, pemeriksaan kepemilikan objek (anti-IDOR), dan batas upload Multer sudah terpasang."*

## Trust and evaluation

- **Not applicable — evaluasi LLM runtime (`EVAL-###`) tidak berlaku karena tidak ada pemanggilan model AI di dalam aplikasi.**
- Untuk prompt pengembangan yang dipakai oleh tim/agen di repo, setiap keluaran kode wajib dinilai melalui kompilasi TypeScript, linter, dan test suite Jest di [TESTING.md](TESTING.md).

## Not applicable or unresolved

- **Not applicable — Prompt Registry & Guardrail Runtime:** Tidak ada sistem prompt produksi, tool-calling agent, atau memori vektor yang perlu diaudit.

