import { requireDevice } from './device.routes';
import { Router } from 'express';
import { 
  absenMasuk, 
  absenKeluar, 
  mulaiIstirahat, 
  selesaiIstirahat, 
  getAbsensiHariIni, 
  getRiwayatAbsensi, 
  getJadwalHariIni,
  getJadwalMingguan
} from '../controllers/absensi.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

// Middleware: Semua endpoint absensi wajib terautentikasi
router.use(authenticate);

// ─── Endpoint untuk Role Lapangan (SATPAM, CS, UTILITY) ────────────────────────
const roleLapangan = requireRole('SATPAM', 'CS', 'UTILITY');

router.post('/masuk', roleLapangan, uploadImage.single('foto'), requireDevice, absenMasuk);
router.post('/keluar', roleLapangan, uploadImage.single('foto'), requireDevice, absenKeluar);
router.post('/mulai-istirahat', roleLapangan, requireDevice, mulaiIstirahat);
router.post('/selesai-istirahat', roleLapangan, requireDevice, selesaiIstirahat);

router.get('/hari-ini', roleLapangan, getAbsensiHariIni);
router.get('/jadwal-hari-ini', roleLapangan, getJadwalHariIni);
router.get('/jadwal-mingguan', roleLapangan, getJadwalMingguan);
router.get('/riwayat', roleLapangan, getRiwayatAbsensi);

// ─── Endpoint Khusus ADMIN ──────────────────────────────────────────────────
// Endpoint ini diakses dari Web Admin
// router.get('/admin', requireRole('ADMIN'), getAdminAbsensi);
// (Untuk lebih bersih, biasanya dibuat di admin.routes.ts, tapi diletakkan di sini juga bisa jika base pathnya bukan /absensi saja)

export default router;
