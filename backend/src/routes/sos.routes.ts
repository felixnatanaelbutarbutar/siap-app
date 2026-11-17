import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getIO } from '../lib/socket';
import { getVapidKeys, sendSosWebPush } from '../services/webPush.service';
import { sendMulticast } from '../services/notification.service';
import { logger } from '../utils/logger';

const router = Router();

const createSosSchema = z.object({
  kategori: z
    .enum(['KEAMANAN', 'MEDIS', 'KEBAKARAN', 'FASILITAS', 'LAINNYA'])
    .default('KEAMANAN'),
  keterangan: z
    .string({ required_error: 'Keterangan darurat wajib diisi.' })
    .trim()
    .min(5, 'Jelaskan kondisi darurat minimal 5 karakter.')
    .max(1000, 'Keterangan darurat maksimal 1000 karakter.'),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  akurasi_gps: z.number().positive().nullable().optional(),
});

const subscribeSchema = z.object({
  endpoint: z.string().min(5).optional(),
  keys: z
    .object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    })
    .optional(),
  existing_channel_token: z.string().optional(),
});

const resolveSchema = z.object({
  catatan_admin: z.string().trim().max(1000).optional(),
});

// ─── Public: Ambil VAPID Public Key untuk Browser Push Subscription ───────────
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const { publicKey } = getVapidKeys();
  res.json({ success: true, data: { publicKey } });
});

// ─── Admin Browser Channel: Cek SOS Aktif Meski Tidak Login (pakai channel_token)
router.get('/active-for-channel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelToken = String(req.headers['x-sos-channel'] || '').trim();
    if (!channelToken) {
      res.status(401).json({ success: false, message: 'Channel token tidak ditemukan.' });
      return;
    }

    const sub = await prisma.webPushSubscription.findFirst({
      where: { channel_token: channelToken, aktif: true },
    });
    if (!sub) {
      res.status(401).json({ success: false, message: 'Browser belum terdaftar untuk notifikasi SOS.' });
      return;
    }

    const alerts = await prisma.sosAlert.findMany({
      where: { status: 'AKTIF' },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        staff: {
          select: { id: true, nama: true, nik: true, divisi: true, role: true },
        },
      },
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Daftarkan Browser untuk Web Push & Background SOS Channel ─────────
router.post(
  '/subscribe',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Payload subscription tidak valid.' });
        return;
      }

      const { endpoint, keys, existing_channel_token } = parsed.data;
      const userAgent = String(req.headers['user-agent'] || '').slice(0, 250);

      // Jika browser mendukung PushManager (endpoint http/https)
      const finalEndpoint =
        endpoint && endpoint.startsWith('http')
          ? endpoint
          : `browser-channel://${existing_channel_token || crypto.randomBytes(16).toString('hex')}`;
      const p256dh = keys?.p256dh || 'local-channel';
      const authKey = keys?.auth || 'local-channel';

      const existing = await prisma.webPushSubscription.findUnique({
        where: { endpoint: finalEndpoint },
      });

      const channelToken =
        existing?.channel_token ||
        existing_channel_token ||
        crypto.randomBytes(24).toString('hex');

      const saved = await prisma.webPushSubscription.upsert({
        where: { endpoint: finalEndpoint },
        update: {
          p256dh,
          auth: authKey,
          user_agent: userAgent,
          staff_id: req.user!.id,
          aktif: true,
        },
        create: {
          endpoint: finalEndpoint,
          p256dh,
          auth: authKey,
          channel_token: channelToken,
          user_agent: userAgent,
          staff_id: req.user!.id,
          aktif: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Notifikasi darurat SOS browser aktif. Browser akan tetap menerima peringatan meski tidak sedang login.',
        data: {
          id: saved.id,
          channel_token: saved.channel_token,
          web_push_enabled: saved.endpoint.startsWith('http'),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Nonaktifkan Notifikasi Browser SOS ───────────────────────────────────────
router.post('/unsubscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelToken = String(req.body?.channel_token || req.headers['x-sos-channel'] || '').trim();
    const endpoint = String(req.body?.endpoint || '').trim();

    if (channelToken) {
      await prisma.webPushSubscription.updateMany({
        where: { channel_token: channelToken },
        data: { aktif: false },
      });
    } else if (endpoint) {
      await prisma.webPushSubscription.updateMany({
        where: { endpoint },
        data: { aktif: false },
      });
    }

    res.json({ success: true, message: 'Notifikasi SOS browser dinonaktifkan.' });
  } catch (error) {
    next(error);
  }
});

// ─── Staff Mobile: Kirim SOS Darurat (Wajib Keterangan) ───────────────────────
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSosSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || 'Keterangan darurat wajib diisi.',
        errors: parsed.error.issues,
      });
      return;
    }

    const staff = await prisma.staff.findUnique({
      where: { id: req.user!.id },
      include: { area_tugas: true },
    });
    if (!staff) {
      res.status(404).json({ success: false, message: 'Akun staff tidak ditemukan.' });
      return;
    }

    const { kategori, keterangan, lat, lng, akurasi_gps } = parsed.data;

    const alert = await prisma.sosAlert.create({
      data: {
        staff_id: staff.id,
        kategori,
        keterangan,
        lat: lat ?? staff.area_tugas?.lat ?? null,
        lng: lng ?? staff.area_tugas?.lng ?? null,
        akurasi_gps: akurasi_gps ?? null,
        area_nama: staff.area_tugas?.nama ?? null,
        status: 'AKTIF',
      },
      include: {
        staff: {
          select: { id: true, nama: true, nik: true, divisi: true, role: true },
        },
      },
    });

    // 1. Broadcast realtime ke Admin login, browser Admin tidak login (sos-browsers), DAN HP semua staff lain (staff-all)
    try {
      const io = getIO();
      io.to('admin').to('sos-browsers').to('staff-all').emit('sos:alert', alert);
    } catch (ioErr) {
      logger.warn('Gagal emit socket sos:alert:', ioErr);
    }

    // 2. Kirim W3C Web Push (Service Worker) agar notifikasi tetap muncul meski tab Web Admin ditutup / tidak login
    void sendSosWebPush(alert);

    // 3. Kirim Push Notification (FCM) ke HP seluruh staff aktif lainnya
    void (async () => {
      try {
        const otherStaff = await prisma.staff.findMany({
          where: {
            id: { not: staff.id },
            aktif: true,
            role: { not: 'ADMIN' },
            fcm_token: { not: null },
          },
          select: { fcm_token: true },
        });
        const tokens = otherStaff
          .map((s) => s.fcm_token)
          .filter((t): t is string => Boolean(t));
        if (tokens.length > 0) {
          await sendMulticast(
            tokens,
            `SOS DARURAT: ${staff.nama} (${staff.divisi.replace(/_/g, ' ')})`,
            `[${alert.kategori}] ${alert.keterangan}${alert.area_nama ? ` | Area: ${alert.area_nama}` : ''}`,
            {
              type: 'SOS_ALERT',
              sos_id: alert.id,
              kategori: alert.kategori,
              staff_nama: staff.nama,
              area_nama: alert.area_nama || '',
            }
          );
        }
      } catch (fcmErr) {
        logger.warn('Gagal kirim FCM SOS ke staff lain:', fcmErr);
      }
    })();

    logger.warn(
      `SOS DARURAT [${alert.kategori}] dari ${staff.nama} (${staff.nik}): ${alert.keterangan}`
    );

    res.status(201).json({
      success: true,
      message:
        'Sinyal SOS Darurat berhasil dikirim ke browser Administrator dan seluruh rekan staff aktif.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Staff Mobile: Riwayat SOS Saya ───────────────────────────────────────────
router.get('/mine', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.sosAlert.findMany({
      where: { staff_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Daftar Semua SOS Alert ────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusFilter = String(req.query.status || '').toUpperCase();
      const where =
        statusFilter === 'AKTIF' || statusFilter === 'DITANGANI'
          ? { status: statusFilter }
          : {};

      const [alerts, activeCount, activeSubsCount] = await Promise.all([
        prisma.sosAlert.findMany({
          where,
          orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
          take: 100,
          include: {
            staff: {
              select: { id: true, nama: true, nik: true, divisi: true, role: true },
            },
          },
        }),
        prisma.sosAlert.count({ where: { status: 'AKTIF' } }),
        prisma.webPushSubscription.count({ where: { aktif: true } }),
      ]);

      res.json({
        success: true,
        data: alerts,
        meta: { active_count: activeCount, subscribed_browsers: activeSubsCount },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Admin: Tandai SOS Sudah Ditangani ────────────────────────────────────────
router.patch(
  '/:id/resolve',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = resolveSchema.safeParse(req.body || {});
      const catatan = parsed.success ? parsed.data.catatan_admin : undefined;

      const updated = await prisma.sosAlert.update({
        where: { id: req.params.id },
        data: {
          status: 'DITANGANI',
          handled_by: req.user!.id,
          handled_at: new Date(),
          catatan_admin: catatan || 'Darurat telah ditindaklanjuti oleh Administrator.',
        },
        include: {
          staff: {
            select: { id: true, nama: true, nik: true, divisi: true, role: true },
          },
        },
      });

      try {
        const io = getIO();
        io.to('admin').to('sos-browsers').emit('sos:resolved', updated);
        io.to(`staff:${updated.staff_id}`).emit('sos:resolved', updated);
      } catch {}

      res.json({
        success: true,
        message: 'SOS Darurat ditandai sudah ditangani.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
