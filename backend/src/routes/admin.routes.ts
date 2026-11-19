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
  broadcastNotifikasi,
  getAdminAktivitas
} from '../controllers/admin.controller';
import { getAdminLaporan, reviewLaporan, getAdminLaporanPerJam } from '../controllers/laporan.controller';
import { getJadwal, createJadwal, updateJadwal, deleteJadwal, getRekapJadwal, getPengaturan, updatePengaturan } from '../controllers/jadwal.controller';
import { getAdminIzin, reviewIzin } from '../controllers/izin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadImage } from '../middleware/upload.middleware';

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
router.get('/aktivitas', getAdminAktivitas);

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
router.get('/izin', getAdminIzin);
router.put('/izin/:id', reviewIzin);

// ─── MASTER DATA ────────────────────────────────────────────────────────────
// Staff
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', uploadImage.single('foto_profil'), updateStaff);
router.patch('/staff/:id/toggle-aktif', toggleStaffAktif);

// Area Tugas
router.get('/area-tugas', getAllAreaTugas);
router.post('/area-tugas', createAreaTugas);
router.put('/area-tugas/:id', updateAreaTugas);

// ─── MANAJEMEN JADWAL ───────────────────────────────────────────────────────
router.get('/jadwal', getJadwal);
router.post('/jadwal', createJadwal);
router.put('/jadwal/:id', updateJadwal);
router.delete('/jadwal/:id', deleteJadwal);
router.get('/rekap-jadwal', getRekapJadwal);

// ─── PENGATURAN SISTEM ──────────────────────────────────────────────────────
router.get('/pengaturan-sistem', getPengaturan);
router.put('/pengaturan-sistem', updatePengaturan);

// ─── NOTIFIKASI ─────────────────────────────────────────────────────────────
router.post('/notifikasi/broadcast', broadcastNotifikasi);

export default router;
