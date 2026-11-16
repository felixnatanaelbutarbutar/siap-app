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

router.get('/penerima', roleLapangan, async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const staff = await prisma.staff.findMany({ where:{aktif:true,role:req.user!.role as 'SATPAM'|'UTILITY',id:{not:req.user!.id}}, select:{id:true,nama:true,nik:true}, orderBy:{nama:'asc'} });
    res.json({success:true,data:staff});
  } catch {
    res.status(500).json({success:false,message:'Daftar penerima belum dapat dimuat.'});
  }
});

router.post('/mulai', roleLapangan, mulaiSerahTerima);
router.post('/:id/konfirmasi', roleLapangan, konfirmasiSerahTerima);

export default router;
