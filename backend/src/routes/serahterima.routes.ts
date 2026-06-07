import { Router } from 'express';
import { 
  mulaiSerahTerima, 
  konfirmasiSerahTerima, 
  getRiwayatSerahTerima, 
  getBastUrl 
} from '../controllers/serahterima.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Wajib login
router.use(authenticate);

// ─── Riwayat & BAST ──────────────────────────────────────────────────────────
router.get('/riwayat', getRiwayatSerahTerima);
router.get('/:id/bast', getBastUrl);

// ─── Mulai & Konfirmasi Serah Terima ─────────────────────────────────────────
// Hanya SATPAM & UTILITY yang diizinkan melakukan/mengkonfirmasi serah terima
const roleLapangan = requireRole('SATPAM', 'UTILITY');

router.post('/mulai', roleLapangan, mulaiSerahTerima);
router.post('/:id/konfirmasi', roleLapangan, konfirmasiSerahTerima);

export default router;
