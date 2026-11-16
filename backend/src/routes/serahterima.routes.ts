import { Router } from 'express';
import { 
  mulaiSerahTerima, 
  konfirmasiSerahTerima, 
  getRiwayatSerahTerima, 
  getBastUrl,
  getStaffPenerima,
  getDetailSerahTerima
} from '../controllers/serahterima.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Wajib login
router.use(authenticate);

// ─── Riwayat & BAST & Staff Penerima ──────────────────────────────────────────
const roleLapangan = requireRole('SATPAM', 'UTILITY');

router.get('/riwayat', getRiwayatSerahTerima);
router.get('/staff-penerima', roleLapangan, getStaffPenerima);
router.get('/:id/bast', getBastUrl);
router.get('/:id', getDetailSerahTerima);

// ─── Mulai & Konfirmasi Serah Terima ─────────────────────────────────────────
// Hanya SATPAM & UTILITY yang diizinkan melakukan/mengkonfirmasi serah terima
router.post('/mulai', roleLapangan, mulaiSerahTerima);
router.post('/:id/konfirmasi', roleLapangan, konfirmasiSerahTerima);

export default router;
