# SIAP Mobile

React Native 0.74 Android app.

## Menjalankan di HP USB (Windows)

1. Jalankan backend pada port 3000 dan MinIO pada port 9000.
2. Pasang Android Studio / Android SDK dan JDK 17. Aktifkan USB debugging pada HP.
3. Pastikan `adb devices` menampilkan satu perangkat dengan status `device`.
4. Dari folder mobile, jalankan `npm ci --legacy-peer-deps` untuk instalasi awal.
5. Jalankan `npm start` di satu terminal. Jika Metro sudah berjalan untuk proyek ini, gunakan terminal yang sudah ada.
6. Di terminal lain, jalankan `npm run android`.

Perintah android memilih Java bawaan Android Studio jika JAVA_HOME tidak valid,
menemukan SDK pada lokasi standar Windows, dan meneruskan port 3000, 8081,
serta 9000 melalui USB. API dan gambar lokal memakai localhost melalui forwarding ini.
Jalankan ulang perintah tersebut setelah kabel USB dilepas atau HP dimulai ulang.
Emulator juga dapat memakai forwarding yang sama; hubungkan satu perangkat saja.

Jika JDK/SDK dipasang di lokasi khusus, atur JAVA_HOME (JDK 17) dan ANDROID_HOME
sebelum menjalankan perintah. Jangan memasukkan lokasi SDK komputer lain ke local.properties.
Build pertama dapat mengunduh Gradle, NDK, dan dependency Android.
