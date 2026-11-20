@echo off
setlocal enabledelayedexpansion
title SIAP APP - One-Click Demo Server
color 0A

echo ========================================================================
echo        SIAP (Sistem Informasi Absensi dan Pelaporan)
echo             ONE-CLICK LOCAL DEMO SERVER RUNNER
echo ========================================================================
echo.

:: 1. Deteksi IP Laptop
echo [1/6] Mendeteksi Alamat IP Jaringan Laptop...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback|pseudo' -and $_.IPAddress -notmatch '169\.254\.' -and $_.IPAddress -notmatch '^127\.' } | Sort-Object -Property InterfaceMetric | Select-Object -First 1).IPAddress"`) do (
    set LAPTOP_IP=%%i
)

if "%LAPTOP_IP%"=="" (
    set LAPTOP_IP=127.0.0.1
    echo [PERINGATAN] Laptop tidak terhubung ke Wi-Fi atau LAN. Menggunakan localhost.
) else (
    echo [OK] Alamat IP Laptop Anda: %LAPTOP_IP%
)
echo.

:: 2. Pastikan Docker Desktop Menyala
echo [2/6] Memeriksa Layanan Docker Desktop...
docker info >nul 2>&1
if %errorlevel% equ 0 goto DOCKER_READY

echo [INFO] Docker Desktop belum aktif. Mencoba menyalakan Docker...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Menunggu Docker engine siap sekitar 15 sampai 20 detik...

:WAIT_DOCKER
ping 127.0.0.1 -n 4 >nul
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Menunggu Docker engine aktif...
    goto WAIT_DOCKER
)

:DOCKER_READY
echo [OK] Docker siap berjalan.
echo.

:: 3. Jalankan Database PostgreSQL & MinIO
echo [3/6] Menghidupkan Database PostgreSQL dan MinIO Storage...
cd infra
call docker compose up -d
if %errorlevel% neq 0 (
    call docker-compose up -d
)
cd ..
echo [OK] Kontainer database dan storage aktif.
echo.

:: 4. Jalankan Migrasi Prisma Database
echo [4/6] Memeriksa dan Menyelaraskan Basis Data Prisma...
cd backend
call npx prisma migrate deploy
cd ..
echo [OK] Database siap digunakan.
echo.

:: 5. Menjalankan Backend dan Web Admin
echo [5/6] Menyalakan Backend Server Port 3000 dan Web Admin Port 5173...
start "SIAP - Backend Server (Port 3000)" cmd /k "cd backend && npm run dev"
start "SIAP - Web Admin (Port 5173)" cmd /k "cd web-admin && npm run dev -- --host"

:: 6. Menyalakan Cloudflare Tunnel untuk Akses Internet / Beda Wi-Fi
echo [6/6] Menghubungkan ke Cloudflare Tunnel (Akses Beda Wi-Fi / Paket Data 4G)...
if not exist cloudflared.exe (
    echo [INFO] Mengunduh komponen Cloudflare Tunnel...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)
taskkill /IM cloudflared.exe /F >nul 2>&1
if exist cloudflared_api.log del cloudflared_api.log >nul 2>&1
if exist cloudflared_admin.log del cloudflared_admin.log >nul 2>&1

start "SIAP - Tunnel Backend" /min cmd /c "cloudflared.exe tunnel --url http://localhost:3000 --logfile cloudflared_api.log"
start "SIAP - Tunnel Web Admin" /min cmd /c "cloudflared.exe tunnel --url http://localhost:5173 --logfile cloudflared_admin.log"

echo Menunggu jalur publik online sekitar 8 detik...
ping 127.0.0.1 -n 9 >nul

for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Content cloudflared_api.log -ErrorAction SilentlyContinue | Select-String 'https://.*\.trycloudflare\.com' | ForEach-Object { if ($_.Line -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') { $matches[1] } } | Select-Object -First 1"') do set TUNNEL_API=%%a

for /f "tokens=*" %%b in ('powershell -NoProfile -Command "Get-Content cloudflared_admin.log -ErrorAction SilentlyContinue | Select-String 'https://.*\.trycloudflare\.com' | ForEach-Object { if ($_.Line -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') { $matches[1] } } | Select-Object -First 1"') do set TUNNEL_ADMIN=%%b

cls
echo ========================================================================
echo        SIAP APP - SERVER DEMO LAPTOP BERHASIL DIAKTIFKAN!
echo ========================================================================
echo.
echo  STATUS SERVER : ONLINE DAN AKTIF
echo.
echo  ------------------------------------------------------------------------
echo  [1] JALUR PUBLIK INTERNET (BISA DIAKSES DARI BEDA WI-FI / PAKET DATA 4G):
echo  ------------------------------------------------------------------------
echo  - Web Admin Publik  : %TUNNEL_ADMIN%
echo  - Backend API Publik : %TUNNEL_API%
echo  - Unduh APK di HP   : %TUNNEL_API%/download/siap.apk
echo.
echo  ------------------------------------------------------------------------
echo  [2] JALUR LOKAL (JIKA DI WI-FI ATAU HOTSPOT YANG SAMA DENGAN LAPTOP):
echo  ------------------------------------------------------------------------
echo  - Web Admin Lokal   : http://localhost:5173 atau http://%LAPTOP_IP%:5173
echo  - Backend API Lokal : http://%LAPTOP_IP%:3000
echo.
echo ========================================================================
echo  CARA CLIENT ATAU PENGUJI MENGAKSES DARI HP MEREKA SENDIRI:
echo ========================================================================
echo  1. Buka browser di HP Client (Chrome/Safari), buka link unduh:
echo        %TUNNEL_API%/download/siap.apk
echo  2. Pasang (install) file APK di HP.
echo  3. Buka aplikasi SIAP di HP.
echo  4. Di halaman Login, klik tombol "Server Host" di bawah tombol MASUK.
echo  5. Masukkan URL Backend Publik:
echo        %TUNNEL_API%
echo     lalu tekan tombol Simpan.
echo  6. Selesai! HP Client langsung terhubung dan siap demo!
echo.
echo ------------------------------------------------------------------------
echo  CATATAN PENTING:
echo  - Jendela ini dan jendela server harus TETAP TERBUKA selama presentasi.
echo  - Jika besok laptop dimatikan atau restart, Anda CUKUP KLIK GANDA lagi file:
echo      START_SERVER_DEMO.bat
echo ========================================================================
echo.
echo Tekan sembarang tombol jika ingin menutup dan mematikan semua server...
pause >nul

echo.
echo Mematikan server demo dan jalur tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SIAP - Backend Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SIAP - Web Admin*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SIAP - Tunnel*" /T /F >nul 2>&1
echo Selesai.
