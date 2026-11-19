import analyticsRoutes from './routes/analytics.routes';
import offlineAttendanceRoutes from './routes/offline-attendance.routes';
import deviceRoutes from './routes/device.routes';
import workforceRoutes from './routes/workforce.routes';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import absensiRoutes from './routes/absensi.routes';
import adminRoutes from './routes/admin.routes';
import laporanRoutes from './routes/laporan.routes';
import izinRoutes from './routes/izin.routes';
import serahTerimaRoutes from './routes/serahterima.routes';
import pengumumanRoutes from './routes/pengumuman.routes';
import sosRoutes from './routes/sos.routes';
import { prisma } from './lib/prisma';
import { initSocket } from './lib/socket';
import { Role, JenisAbsensi } from '@prisma/client';
import { sendToDevice } from './services/notification.service';
import { checkAndSendPreShiftReminders } from './services/shiftReminder.service';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Inisialisasi Socket.io
initSocket(httpServer);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SIAP Backend' });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/offline-attendance', offlineAttendanceRoutes);
app.use('/admin/workforce', workforceRoutes);
app.use('/admin/analytics', analyticsRoutes);
app.use('/absensi', absensiRoutes);
app.use('/admin', adminRoutes);
app.use('/laporan', laporanRoutes);
app.use('/izin', izinRoutes);
app.use('/serah-terima', serahTerimaRoutes);
app.use('/pengumuman', pengumumanRoutes);
app.use('/sos', sosRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Server Start & Cron Jobs (Non-test) ─────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`Server berjalan di http://localhost:${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  // ─── Cleanup job: hapus revoked tokens yang sudah expired ───────────────────
  // Jalan setiap tengah malam, hapus token blacklist yang sudah lewat masa berlaku
  cron.schedule('0 0 * * *', async () => {
    try {
      const deleted = await prisma.revokedToken.deleteMany({
        where: { expired_at: { lt: new Date() } },
      });
      if (deleted.count > 0) {
        logger.info(`🧹 Cleanup: ${deleted.count} expired revoked tokens dihapus.`);
      }
    } catch (error) {
      logger.error('Error pada cleanup revoked tokens:', error);
    }
  });

  // ─── Reminder Laporan Per 6 Jam (Khusus SATPAM yang Sedang Bershift) ───────────
  // Dijalankan setiap jam pada menit ke-55 (tepat 5 menit sebelum jam checkpoint laporan berikutnya)
  cron.schedule('55 * * * *', async () => {
    try {
      const now = new Date();
      // Target checkpoint adalah 5 menit dari sekarang (jam genap berikutnya)
      const targetCheckpointTime = new Date(now.getTime() + 5 * 60 * 1000);
      const targetHour = targetCheckpointTime.getHours();

      // Cari SATPAM aktif yang memiliki FCM token
      const satpamList = await prisma.staff.findMany({
        where: { role: Role.SATPAM, aktif: true, fcm_token: { not: null } },
        select: { id: true, nama: true, fcm_token: true }
      });

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      let notifTerkirim = 0;

      for (const satpam of satpamList) {
        // Cek apakah satpam HANYA yang sedang bershift (sudah MASUK dan BELUM KELUAR hari ini)
        const absensiHariIni = await prisma.absensi.findMany({
          where: { staff_id: satpam.id, waktu_server: { gte: startOfDay, lte: endOfDay } }
        });

        const absenMasuk = absensiHariIni.find(a => a.jenis === JenisAbsensi.MASUK);
        const sudahKeluar = absensiHariIni.some(a => a.jenis === JenisAbsensi.KELUAR);

        // Hanya kirim notif jika petugas sedang aktif bershift
        if (absenMasuk && !sudahKeluar) {
          // Hitung selisih jam dari absen masuk ke target checkpoint
          const diffMs = targetCheckpointTime.getTime() - absenMasuk.waktu_server.getTime();
          const diffHours = Math.round(diffMs / (60 * 60 * 1000));

          // Pemicu tepat per 6 jam sejak absen masuk (misal jam ke-6, jam ke-12)
          if (diffHours > 0 && diffHours % 6 === 0) {
            // Cek apakah sudah membuat laporan untuk jam target tersebut
            const laporanTerbuat = await prisma.laporanPerJam.findFirst({
              where: { staff_id: satpam.id, tanggal: startOfDay, jam: targetHour }
            });

            if (!laporanTerbuat && satpam.fcm_token) {
              const jamTargetStr = `${targetHour.toString().padStart(2, '0')}:00`;
              await sendToDevice(
                satpam.fcm_token,
                'Pengingat Laporan Rutin 6 Jam (5 Menit Lagi)',
                `Waktu pengisian laporan rutin 6 jam akan tiba pukul ${jamTargetStr}. Segera lakukan pengecekan area tugas dan submit laporan Anda.`,
                { type: 'reminder_laporan_perjam', jam: targetHour.toString() }
              );
              notifTerkirim++;
              logger.info(`[Reminder 6 Jam] Notifikasi H-5 dikirim ke Satpam ${satpam.nama} untuk target ${jamTargetStr}`);
            }
          }
        }
      }
      logger.info(`✅ Cron Job: Reminder Laporan Per 6 Jam selesai dicek. Terkirim ke ${notifTerkirim} petugas bershift.`);
    } catch (error) {
      logger.error('Error pada cron reminder laporan per 6 jam:', error);
    }
  });

  // ─── Pengingat 1 Jam Sebelum Shift Dimulai (Semua Staff Aktif) ─────────────
  // Jalan setiap menit agar jadwal mulai seperti 07:30, 08:00, 15:00, 23:00 tepat waktu
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendPreShiftReminders();
    } catch (error) {
      logger.error('Error pada cron pengingat 1 jam sebelum shift:', error);
    }
  });
}

export default app;
