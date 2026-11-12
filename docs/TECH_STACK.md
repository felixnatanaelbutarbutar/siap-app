# Technology Stack — SIAP

## Observed stack

Semua komponen di bawah ini terverifikasi langsung dari manifest dependensi dan file konfigurasi yang ada di repositori:

| Layer | Teknologi & Versi | Bukti File | Status |
| --- | --- | --- | --- |
| Backend Runtime & Framework | Node.js (Docker `node:20-alpine`), Express `^4.19.2`, TypeScript `^5.5.3` | `backend/package.json`, `backend/Dockerfile` | Observed |
| ORM & Database | Prisma `^5.16.0` (Client `5.22.0` ter-generate), PostgreSQL `16-alpine` | `backend/package.json`, `backend/prisma/schema.prisma`, `infra/docker-compose.yml` | Observed |
| Realtime & Scheduler | `socket.io ^4.7.5`, `node-cron ^3.0.3` | `backend/package.json`, `backend/src/lib/socket.ts`, `backend/src/index.ts` | Observed |
| Storage, Media & PDF | MinIO (`minio/minio:latest`), `@aws-sdk/client-s3 ^3.600.0`, `sharp ^0.33.4`, `pdfkit ^0.15.0`, `multer ^1.4.5-lts.1` | `infra/docker-compose.yml`, `backend/src/services/` | Observed |
| Validasi, Auth & Utilitas | `zod ^3.23.8`, `bcryptjs ^2.4.3`, `jsonwebtoken ^9.0.2`, `express-rate-limit ^7.4.0`, `helmet ^7.1.0`, `geolib ^3.3.4`, `papaparse ^5.4.1`, `winston ^3.19.0`, `firebase-admin ^12.3.0` | `backend/package.json` | Observed |
| Web Admin | React `^18.3.1`, Vite `^5.3.1`, TypeScript `^5.2.2`, `@tanstack/react-router ^1.170.9`, `@tanstack/react-query ^5.100.14`, `zustand ^5.0.14`, `axios ^1.16.1`, `socket.io-client ^4.8.3`, `tailwindcss ^3.4.19`, `leaflet ^1.9.4`, `react-leaflet ^4.2.1`, `recharts ^3.8.1`, `lucide-react ^1.17.0` | `web-admin/package.json` | Observed |
| Mobile App | React Native `0.74.0`, React `18.2.0`, TypeScript `5.0.4`, `@react-navigation/native ^6.1.18`, `@op-engineering/op-sqlite ^16.2.0`, `@tanstack/react-query ^5.100.14`, `zustand ^5.0.14`, `react-native-paper ^5.15.3`, `react-native-vision-camera ^4.5.3`, `react-native-geolocation-service ^5.3.1`, `@notifee/react-native ^9.1.8`, `@react-native-firebase/messaging ^24.0.0`, `react-native-signature-canvas ^5.0.2`, `react-native-pdf ^7.0.4` | `mobile/package.json` | Observed |
| Infrastruktur & CI/CD | Docker Compose (`infra/docker-compose.yml`, `infra/docker-compose.prod.yml`), Nginx Alpine (`infra/nginx/conf.d/default.conf`), GitHub Actions (`.github/workflows/deploy.yml`) | `infra/`, `.github/workflows/deploy.yml` | Observed |
| Testing Backend | Jest `^29.7.0`, `ts-jest ^29.2.2`, `supertest ^7.0.0` (`4` suite, `16` tes lulus terhadap `siap_test_db`) | `backend/package.json`, `backend/tests/` | Observed |

## Proposed choices

- **Observed (Telah Diterapkan pada M1–M4):** `VITE_API_URL` / `VITE_SOCKET_URL` pada `web-admin/src/services/api.ts`, `API_BASE_URL` terpusat pada `mobile/src/services/`, penyelarasan `MINIO_BUCKET=siap-storage` & `MINIO_PUBLIC_URL` pada `infra/docker-compose.prod.yml` dan Nginx `/socket.io/` + `/storage/`.
- **Proposed — approval required**: Mengganti penggunaan `express-rate-limit` memory store menjadi store persisten hanya jika backend di-scale lebih dari 1 instance; untuk single instance (`docker-compose.prod.yml`), memory store sudah sesuai batasan `TASKS_SIAP.md`.
- **Proposed — approval required**: Menjalankan `npm run build` dan Jest test suite (`backend/tests/`) pada GitHub Actions CI sebelum tahap SSH deploy di `.github/workflows/deploy.yml`.

## Alternatives and risks

- **Firebase Admin & `@react-native-firebase/messaging`**: Alternatifnya adalah push notification berbasis Expo atau WebSocket-only, namun Firebase sudah tertanam di backend dan mobile. Risiko utama: jika `FIREBASE_PRIVATE_KEY` atau `google-services.json` tidak valid/kedaluwarsa, pengiriman push gagal diam-diam (`notification.service.ts` hanya mencatat error ke logger).
- **MinIO Self-Hosted vs Managed S3**: MinIO memberi kontrol lokal tanpa biaya egress cloud; di balik Nginx produksi kini tersedia blok `location /storage/` menuju `http://minio:9000` dengan `MINIO_PUBLIC_URL` agar berkas tetap dapat diakses browser/mobile melalui domain publik.
- **`op-sqlite` + React Query Persistence**: Memberi penyimpanan luring cepat di Android/iOS; `NetworkManager.tsx` kini mengarahkan antrean SQLite `absensi_offline` ke `/absensi/masuk`, `/absensi/keluar`, `/absensi/mulai-istirahat`, dan `/absensi/selesai-istirahat`.
- **Pembersihan Direktori `temp-admin/` dan `temp_mobile/`**: Telah dihapus pada Milestone M4 untuk menghindari duplikasi manifest dan kebingungan pengembang.

## Support and upgrade policy

- **Versi Prisma**: `backend/package.json` mencantumkan `^5.16.0` (terpasang `5.22.0`). CLI Prisma menampilkan pembaruan mayor ke v8; **jangan** upgrade mayor tanpa uji regresi migrasi dan query.
- **React Native `0.74.0`**: Proyek memakai `npm install --legacy-peer-deps` pada `start-all.bat` karena konflik peer dependency ekosistem RN. Setiap pembaruan paket native Android/iOS harus diuji pada build Gradle (`mobile/android/build.gradle`) sebelum digabungkan.
- **Kebijakan Dependensi**: Disarankan menjalankan `npm audit` secara berkala pada `backend/`, `web-admin/`, dan `mobile/` serta mengunci versi `package-lock.json` yang sudah ada.

