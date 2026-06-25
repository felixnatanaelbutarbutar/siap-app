@echo off
echo =======================================================
echo     SIAP APP - One-Click Developer Environment
echo =======================================================
echo.

echo [1/4] Menghidupkan Infrastruktur (Docker)...
cd infra
docker-compose up -d
cd ..
echo.

echo [2/4] Menghidupkan Mesin Utama (Backend)...
start "SIAP - Backend" cmd /k "cd backend && npm install && npm run prisma:generate && npm run dev"

echo [3/4] Menghidupkan Pusat Komando (Web Admin)...
start "SIAP - Web Admin" cmd /k "cd web-admin && npm install && npm run dev"

echo [4/4] Menerjunkan Pasukan Lapangan (Mobile App)...
start "SIAP - Mobile App" cmd /k "cd mobile && npm install --legacy-peer-deps && npm run android"

echo.
echo =======================================================
echo SEMUA LAYANAN SEDANG DIHIDUPKAN DI JENDELA TERPISAH!
echo.
echo - Web Admin akan tersedia di : http://localhost:5173
echo - Backend akan tersedia di   : http://localhost:3000
echo.
echo Catatan: 
echo Biarkan jendela terminal yang baru terbuka untuk melihat log.
echo =======================================================
pause
