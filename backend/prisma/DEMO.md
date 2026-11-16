# Data video demo lokal

Jalankan dari backend: `npm run prisma:seed:demo`.
Seed hanya mengizinkan database localhost development. Data demo memiliki ID awalan
`demo-video-` dan nama bertanda Demo; akun asli tidak diganti. Menjalankan ulang
memperbarui data demo dan mengembalikan status contoh, sehingga lakukan sebelum rekaman.

Admin: NIK `99000`, password `DemoSiap2026!`.
Staf: NIK `99101` sampai `99112`, password yang sama.
99101-99104 keamanan; 99105-99108 CS; 99109-99112 utility.

Cakupan: tiga area tugas, jadwal mingguan, riwayat absensi dua minggu,
laporan berbagai kategori/status, laporan per jam, izin/cuti, pengumuman,
serah terima pending dan selesai, serta lampiran ilustrasi dan PDF BAST simulasi.
Tanggal dibuat relatif terhadap hari saat seed dijalankan dalam zona Asia/Jakarta.
Dashboard memakai lokasi absensi; ini bukan simulasi pergerakan GPS realtime.

Urutan demo: dashboard > staf/jadwal > absensi/kalender > review laporan >
persetujuan izin > serah terima/unduh BAST > pengumuman > pengaturan area.
Push notification memerlukan konfigurasi Firebase asli dan tidak disimulasikan.
