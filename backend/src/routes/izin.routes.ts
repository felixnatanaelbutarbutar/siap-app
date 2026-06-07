import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { uploadFile } from '../services/storage.service';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Pengajuan Izin/Cuti (Mobile)
router.post('/', authenticate, upload.single('foto'), async (req: any, res: any) => {
  try {
    const { jenis, tanggal_mulai, tanggal_selesai, keterangan } = req.body;
    const staffId = req.user.id;

    let foto_url = null;
    if (req.file) {
      const extension = req.file.originalname.split('.').pop();
      const filename = `izin/${staffId}_${Date.now()}.${extension}`;
      foto_url = await uploadFile(req.file.buffer, filename, req.file.mimetype);
    }

    const izin = await prisma.izinCuti.create({
      data: {
        staff_id: staffId,
        jenis,
        tanggal_mulai: new Date(tanggal_mulai),
        tanggal_selesai: new Date(tanggal_selesai),
        keterangan,
        foto_url,
      },
    });

    res.json({ success: true, data: izin });
  } catch (error) {
    console.error('Error pengajuan izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengajukan izin' });
  }
});

// 2. Lihat Riwayat Izin Saya (Mobile)
router.get('/saya', authenticate, async (req: any, res: any) => {
  try {
    const izin = await prisma.izinCuti.findMany({
      where: { staff_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: izin });
  } catch (error) {
    console.error('Error get izin:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat riwayat izin' });
  }
});

export default router;
