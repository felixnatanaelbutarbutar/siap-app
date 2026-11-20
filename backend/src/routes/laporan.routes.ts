import { reportSchedule } from '../services/reportSchedule.service';
import { safe } from './device.routes';
import { Router } from 'express';
import { 
  createLaporan, 
  getLaporanSaya, 
  getDetailLaporan,
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
const khususSatpam = roleLapangan; // Legacy endpoint name, now available to all field roles.

router.post('/perjam', khususSatpam, uploadImage.single('foto'), createLaporanPerJam);
router.get('/perjam', khususSatpam, getLaporanPerJamSaya);
router.get('/perjam/jadwal', khususSatpam, safe(async(req,res)=>{res.json({data:await reportSchedule(req.user!.id)});}));

// Place the dynamic route after /perjam; staff may only read their own reports.
router.get('/:id', roleLapangan, getDetailLaporan);

export default router;
