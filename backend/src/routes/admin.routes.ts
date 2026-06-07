import { Router } from 'express';
import { getAdminAbsensi } from '../controllers/absensi.controller';
import { getAdminSerahTerima, getAdminInventarisBermasalah } from '../controllers/serahterima.controller';
import { 
  getDashboardSummary, 
  getDashboardChart,
  getDashboardActivities,
  getLiveTracking, 
  getStatistikKehadiran, 
  exportAbsensiCsv,
  getAllStaff,
  createStaff,
  updateStaff,
  toggleStaffAktif,
  getAllAreaTugas,
  createAreaTugas,
  updateAreaTugas,
  broadcastNotifikasi
} from '../controllers/admin.controller';
import { getAdminLaporan, reviewLaporan, getAdminLaporanPerJam } from '../controllers/laporan.controller';
// Removed duplicate import
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Middleware: Semua rute admin butuh login dan Role = ADMIN
router.use(authenticate, requireRole('ADMIN'));

// ─── DASHBOARD & STATISTIK ──────────────────────────────────────────────────
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/chart', getDashboardChart);
router.get('/dashboard/activities', getDashboardActivities);
router.get('/dashboard/live-tracking', getLiveTracking);
router.get('/statistik/kehadiran', getStatistikKehadiran);
router.get('/export/absensi', exportAbsensiCsv);

// ─── TRANSAKSIONAL ──────────────────────────────────────────────────────────

// Absensi
router.get('/absensi', getAdminAbsensi);

// Laporan
router.get('/laporan', getAdminLaporan);
router.patch('/laporan/:id/review', reviewLaporan);

// Laporan Per Jam
router.get('/laporan-perjam', getAdminLaporanPerJam);

// Serah Terima
router.get('/serah-terima', getAdminSerahTerima);
router.get('/inventaris/bermasalah', getAdminInventarisBermasalah);

// ─── MANAJEMEN IZIN & CUTI ──────────────────────────────────────────────────
router.get('/izin', async (req: any, res: any) => {
  try {
    const izinList = await (global as any).prisma.izinCuti.findMany({
      include: {
        staff: { select: { nama: true, nik: true, divisi: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: izinList });
  } catch (error) {
    console.error('Error get izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data izin' });
  }
});

router.put('/izin/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, komentar_admin } = req.body;
    const updatedIzin = await (global as any).prisma.izinCuti.update({
      where: { id },
      data: { status, komentar_admin }
    });
    res.json({ success: true, data: updatedIzin });
  } catch (error) {
    console.error('Error update izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate status izin' });
  }
});

// ─── MASTER DATA ────────────────────────────────────────────────────────────
// Staff
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.patch('/staff/:id/toggle-aktif', toggleStaffAktif);

// Area Tugas
router.get('/area-tugas', getAllAreaTugas);
router.post('/area-tugas', createAreaTugas);
router.put('/area-tugas/:id', updateAreaTugas);

// ─── NOTIFIKASI ─────────────────────────────────────────────────────────────
router.post('/notifikasi/broadcast', broadcastNotifikasi);

export default router;
