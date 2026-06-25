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
import { getJadwal, createJadwal, updateJadwal, deleteJadwal, getRekapJadwal, getPengaturan, updatePengaturan } from '../controllers/jadwal.controller';
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
    
    // Fetch izin with staff fcm_token before updating
    const izin = await (global as any).prisma.izinCuti.findUnique({
      where: { id },
      include: { staff: { select: { nama: true, fcm_token: true } } }
    });
    
    if (!izin) {
      return res.status(404).json({ success: false, message: 'Data izin tidak ditemukan.' });
    }
    
    const updatedIzin = await (global as any).prisma.izinCuti.update({
      where: { id },
      data: { status, komentar_admin }
    });

    // Kirim push notification ke staff
    if (izin.staff?.fcm_token) {
      const { sendToDevice } = require('../services/notification.service');
      const statusLabel = status === 'APPROVED' ? 'Disetujui ✅' : 'Ditolak ❌';
      const title = `Permohonan Izin ${statusLabel}`;
      const body = komentar_admin
        ? `Catatan Admin: ${komentar_admin}`
        : `Permohonan izin Anda telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'} oleh Admin.`;
      
      try {
        await sendToDevice(izin.staff.fcm_token, title, body, {
          type: 'izin_review',
          izin_id: id,
          status
        });
      } catch (fcmErr) {
        console.error('Gagal kirim notif FCM izin:', fcmErr);
      }
    }

    res.json({ success: true, data: updatedIzin, message: `Izin berhasil di-${status === 'APPROVED' ? 'setujui' : 'tolak'}.` });
  } catch (error) {
    console.error('Error update izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate status izin' });
  }
});

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
