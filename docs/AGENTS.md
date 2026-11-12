# Target Project Agent Guidance — SIAP

## Repository map

- `backend/`: API Express + TypeScript + Prisma (`src/routes/`, `src/controllers/`, `src/schemas/`, `src/middleware/`, `src/services/`, `src/lib/`, `prisma/`, `tests/`).
- `web-admin/`: Dashboard Admin React 18 + Vite + TanStack Router (`src/routes/`, `src/components/`, `src/services/`, `src/store/`).
- `mobile/`: Aplikasi lapangan React Native 0.74 (`src/screens/`, `src/navigation/`, `src/components/`, `src/services/`, `src/store/`, `android/`, `ios/`).
- `infra/`: Konfigurasi Docker Compose dev (`docker-compose.yml`), prod (`docker-compose.prod.yml`), Nginx (`nginx/`), dan `backup.sh`.
- `docs/`: Suite 21 dokumen arsitektur terkelola oleh skill `architect-docs-engine`.

## Working rules

1. **Gunakan `prisma` singleton:** Selalu impor `prisma` dari `backend/src/lib/prisma.ts`. Dilarang memakai `(global as any).prisma` atau membuat `new PrismaClient()` baru di route/controller.
2. **Validasi Server-Side Wajib:** Setiap endpoint baru atau yang diperbaiki di `backend/src/` wajib menggunakan `authenticate`, `requireRole` (dan pengecekan kepemilikan objek bila mengakses data milik user/staff tertentu), serta validasi input Zod.
3. **Upload Aman:** Gunakan `uploadImage` dari `backend/src/middleware/upload.middleware.ts` (batas 5 MB & MIME gambar) untuk semua endpoint unggah foto; jangan gunakan `multer({ storage: multer.memoryStorage() })` tanpa batas.
4. **Sinkronisasi Kontrak Lintas-Layer:** Sebelum mengubah payload REST atau event Socket.io di `backend/`, periksa dan perbarui pemanggilnya di `web-admin/src/` dan `mobile/src/` pada perubahan yang sama.
5. **Keamanan Rahasia:** Jangan membaca, menyalin, atau mem-commit `.env`, `firebase-service-account.json`, atau kredensial lokal ke kode maupun dokumentasi.
6. **Pemeliharaan Dokumentasi:** Setiap perubahan arsitektur, model, atau endpoint wajib memperbarui dokumen terkait di `docs/` dan memvalidasinya dengan CLI `architect-docs-engine`.

## Commands and verification

- **Infrastruktur Docker:** `cd infra && docker compose up -d`
- **Backend:** `cd backend && npm run prisma:generate && npx tsc --noEmit && npm run lint && npm run build && npm test -- --runInBand`
- **Web Admin:** `cd web-admin && npm run build && npm run lint`
- **Mobile:** `cd mobile && npx tsc --noEmit && npm run lint`
- **Audit Dokumentasi (`architect-docs-engine`):**
  ```powershell
  python .agents/skills/architect-docs-engine/scripts/cli.py validate-skill
  python .agents/skills/architect-docs-engine/scripts/cli.py audit --project .
  python .agents/skills/architect-docs-engine/scripts/cli.py traceability --project .
  python .agents/skills/architect-docs-engine/scripts/cli.py validate-config --project .
  ```

## Definition of done

Sebuah perubahan fitur atau perbaikan bug di proyek SIAP dianggap selesai hanya jika:
1. Kode terkompilasi tanpa error (`tsc --noEmit` / `vite build`) dan lolos linter (`npm run lint`).
2. Tidak ada penggunaan `(global as any).prisma`, data tiruan/dummy `Math.random()`, atau rahasia hardcoded baru.
3. Kontrak API/Socket konsisten antara `backend`, `web-admin`, dan `mobile`.
4. Kasus uji terkait di `backend/tests/` diperbarui dan lulus saat dijalankan terhadap database uji.
5. Suite dokumentasi `docs/` diperbarui dan audit mekanis (`audit` + `traceability`) bebas error.
