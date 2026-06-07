import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import absensiRoutes from './routes/absensi.routes';
import adminRoutes from './routes/admin.routes';
import laporanRoutes from './routes/laporan.routes';
import izinRoutes from './routes/izin.routes';
import serahTerimaRoutes from './routes/serahterima.routes';
import { prisma } from './lib/prisma';
import { initSocket } from './lib/socket';
import { Role, JenisAbsensi } from '@prisma/client';
import { sendToDevice } from './services/notification.service';

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
app.use('/absensi', absensiRoutes);
app.use('/admin', adminRoutes);
app.use('/laporan', laporanRoutes);
app.use('/izin', izinRoutes);
app.use('/serah-terima', serahTerimaRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Server Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server berjalan di http://localhost:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// ─── Cleanup job: hapus revoked tokens yang sudah expired ─────────────────────
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

// ─── Reminder Laporan Per Jam (Khusus SATPAM) ─────────────────────────────────
// Jalan setiap jam, menit 0 (misal: 08:00, 09:00, dst)
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Cari semua SATPAM yang sedang aktif dan punya fcm_token
    const satpamList = await prisma.staff.findMany({
      where: { role: Role.SATPAM, aktif: true, fcm_token: { not: null } },
      select: { id: true, fcm_token: true }
    });

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    for (const satpam of satpamList) {
      // Cek apakah satpam sedang shift (sudah MASUK hari ini, tapi belum KELUAR)
      const absensiHariIni = await prisma.absensi.findMany({
        where: { staff_id: satpam.id, waktu_server: { gte: startOfDay, lte: endOfDay } }
      });

      const sudahMasuk = absensiHariIni.some(a => a.jenis === JenisAbsensi.MASUK);
      const sudahKeluar = absensiHariIni.some(a => a.jenis === JenisAbsensi.KELUAR);

      if (sudahMasuk && !sudahKeluar) {
        // Cek apakah sudah membuat laporan untuk jam saat ini
        const laporanTerbuat = await prisma.laporanPerJam.findFirst({
          where: { staff_id: satpam.id, tanggal: startOfDay, jam: currentHour }
        });

        if (!laporanTerbuat && satpam.fcm_token) {
          await sendToDevice(
            satpam.fcm_token,
            'Reminder Laporan Per Jam',
            `Anda belum mengisi laporan per jam untuk pukul ${currentHour}:00. Harap segera diisi.`,
            { type: 'reminder_laporan_perjam', jam: currentHour.toString() }
          );
        }
      }
    }
    logger.info(`✅ Cron Job: Reminder Laporan Per Jam untuk pukul ${currentHour}:00 selesai dicek.`);
  } catch (error) {
    logger.error('Error pada cron reminder laporan per jam:', error);
  }
});

export default app;
