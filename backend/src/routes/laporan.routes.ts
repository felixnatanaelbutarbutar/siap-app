import { Router } from 'express';
import { 
  createLaporan, 
  getLaporanSaya, 
  updateLaporan, 
  createLaporanPerJam, 
  getLaporanPerJamSaya 
} from '../controllers/laporan.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

// Semua rute laporan wajib terautentikasi
router.use(authenticate);

// ─── Laporan Harian (SATPAM, CS, UTILITY) ──────────────────────────────────
const roleLapangan = requireRole('SATPAM', 'CS', 'UTILITY');

// Maksimal 5 foto per laporan
router.post('/', roleLapangan, uploadImage.array('foto', 5), createLaporan);
router.get('/', roleLapangan, getLaporanSaya);
router.put('/:id', roleLapangan, updateLaporan);

// ─── Laporan Per Jam (Khusus SATPAM) ───────────────────────────────────────
const khususSatpam = requireRole('SATPAM');

router.post('/perjam', khususSatpam, uploadImage.single('foto'), createLaporanPerJam);
router.get('/perjam', khususSatpam, getLaporanPerJamSaya);

export default router;
