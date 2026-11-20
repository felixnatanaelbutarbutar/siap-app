import 'dotenv/config';
import { sendReportReminders } from './services/reportSchedule.service';
import analyticsRoutes from './routes/analytics.routes';
import offlineAttendanceRoutes from './routes/offline-attendance.routes';
import deviceRoutes from './routes/device.routes';
import workforceRoutes from './routes/workforce.routes';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
