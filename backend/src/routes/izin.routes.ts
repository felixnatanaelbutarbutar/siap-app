import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadImage } from '../middleware/upload.middleware';
import { createIzin, getMyIzin } from '../controllers/izin.controller';

const router = Router();

// 1. Pengajuan Izin/Cuti (Mobile)
router.post('/', authenticate, uploadImage.single('foto'), createIzin);

// 2. Lihat Riwayat Izin Saya (Mobile)
router.get('/saya', authenticate, getMyIzin);

export default router;
