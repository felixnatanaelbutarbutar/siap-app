import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { uploadFile } from '../services/storage.service';
import { sendToDevice } from '../services/notification.service';
import { createIzinSchema, reviewIzinSchema } from '../schemas/izin.schema';

// ─── POST /izin (Mobile) ──────────────────────────────────────────────────────
export const createIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = createIzinSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { jenis, tanggal_mulai, tanggal_selesai, keterangan } = parsed.data;

    let foto_url: string | null = null;
    if (req.file) {
      const extension = req.file.originalname.split('.').pop() || 'jpg';
      const filename = `izin/${user.id}_${Date.now()}.${extension}`;
      foto_url = await uploadFile(req.file.buffer, filename, req.file.mimetype);
    }

    const izin = await prisma.izinCuti.create({
      data: {
        staff_id: user.id,
        jenis,
        tanggal_mulai: new Date(tanggal_mulai),
        tanggal_selesai: new Date(tanggal_selesai),
        keterangan,
        foto_url,
      },
    });

    res.status(201).json({ success: true, data: izin });
  } catch (error) {
    logger.error('Error pengajuan izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengajukan izin' });
  }
};

// ─── GET /izin/saya (Mobile) ──────────────────────────────────────────────────
export const getMyIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const izin = await prisma.izinCuti.findMany({
      where: { staff_id: req.user!.id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: izin });
  } catch (error) {
    logger.error('Error get izin saya:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat riwayat izin' });
  }
};

// ─── GET /admin/izin ──────────────────────────────────────────────────────────
export const getAdminIzin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const izinList = await prisma.izinCuti.findMany({
      include: {
        staff: { select: { nama: true, nik: true, divisi: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: izinList });
  } catch (error) {
    logger.error('Error get admin izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data izin' });
  }
};

// ─── PUT /admin/izin/:id ──────────────────────────────────────────────────────
export const reviewIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = reviewIzinSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { status, komentar_admin } = parsed.data;

    const izin = await prisma.izinCuti.findUnique({
      where: { id },
      include: { staff: { select: { nama: true, fcm_token: true } } },
    });

    if (!izin) {
      res.status(404).json({ success: false, message: 'Data izin tidak ditemukan.' });
      return;
    }

    const updatedIzin = await prisma.izinCuti.update({
      where: { id },
      data: { status, komentar_admin },
    });

    if (izin.staff?.fcm_token) {
      const statusLabel = status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
      const title = `Permohonan Izin ${statusLabel}`;
      const body = komentar_admin
        ? `Catatan Admin: ${komentar_admin}`
        : `Permohonan izin Anda telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'} oleh Admin.`;

      try {
        await sendToDevice(izin.staff.fcm_token, title, body, {
          type: 'izin_review',
          izin_id: id,
          status,
        });
      } catch (fcmErr) {
        logger.error('Gagal kirim notif FCM izin:', fcmErr);
      }
    }

    res.json({
      success: true,
      data: updatedIzin,
      message: `Izin berhasil di-${status === 'APPROVED' ? 'setujui' : 'tolak'}.`,
    });
  } catch (error) {
    logger.error('Error update izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate status izin' });
  }
};
