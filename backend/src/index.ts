import 'dotenv/config';
import { sendReportReminders } from './services/reportSchedule.service';
import analyticsRoutes from './routes/analytics.routes';
import offlineAttendanceRoutes from './routes/offline-attendance.routes';
import deviceRoutes from './routes/device.routes';
import workforceRoutes from './routes/workforce.routes';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';

import { downloadFile } from './services/storage.service';
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

// Environment is loaded before service imports.

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

// ─── Storage Proxy & APK Download (untuk Demo & Tunnel Internet) ──────────────
app.get('/storage/:bucket/*', async (req, res) => {
  try {
    const objectKey = (req.params as any)[0];
    const buffer = await downloadFile(objectKey);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }
});

app.get('/download/siap.apk', (_req, res) => {
  const rootApk = path.resolve(__dirname, '../../SIAP_Aplikasi_Mobile.apk');
  const releaseApk = path.resolve(__dirname, '../../mobile/android/app/build/outputs/apk/release/app-release.apk');
  const target = fs.existsSync(rootApk) ? rootApk : releaseApk;
  if (fs.existsSync(target)) {
    res.download(target, 'SIAP_Aplikasi_Mobile.apk');
  } else {
    res.status(404).send('Berkas APK belum siap.');
  }
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

  cron.schedule('* * * * *', async () => {
    try {await sendReportReminders();} catch(error){logger.error('Report reminder failed',error);}
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
