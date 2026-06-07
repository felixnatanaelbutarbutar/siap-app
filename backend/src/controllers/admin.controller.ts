import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { sendToDivisi, sendToRole, sendMulticast } from '../services/notification.service';
import { Divisi, JenisAbsensi, StatusLaporan, Role } from '@prisma/client';
import { 
  getStatistikSchema, 
  exportAbsensiSchema,
  createStaffSchema,
  updateStaffSchema,
  createAreaTugasSchema,
  updateAreaTugasSchema,
  broadcastNotifikasiSchema
} from '../schemas/admin.schema';
import bcrypt from 'bcryptjs';
import Papa from 'papaparse';

// ─── DASHBOARD & STATISTIK ──────────────────────────────────────────────────

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Hitung total laporan pending
    const laporanPending = await prisma.laporan.count({
      where: { status: StatusLaporan.SUBMITTED }, // Anggap submitted = pending review
    });

    // 2. Hitung barang bermasalah dari serah terima bulan ini
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const serahTerimaBulanIni = await prisma.serahTerima.findMany({
      where: { created_at: { gte: startOfMonth } },
    });

    let totalBarangBermasalah = 0;
    for (const st of serahTerimaBulanIni) {
      const barangList = st.barang_list as any[];
      if (Array.isArray(barangList)) {
        totalBarangBermasalah += barangList.filter(
          (b) => b.kondisi === 'RUSAK' || b.kondisi === 'HILANG'
        ).length;
      }
    }

    // 3. Status Kehadiran per Divisi
    const divList = [Divisi.KEAMANAN, Divisi.CUSTOMER_SERVICE, Divisi.UTILITY];
    const perDivisi: Record<string, any> = {};

    for (const div of divList) {
      const totalStaff = await prisma.staff.count({ where: { divisi: div, aktif: true } });
      
      const absensiDivisi = await prisma.absensi.findMany({
        where: {
          staff: { divisi: div },
          waktu_server: { gte: today, lte: endOfDay },
        },
        orderBy: { waktu_server: 'asc' },
      });

      const stafUnik = [...new Set(absensiDivisi.map(a => a.staff_id))];
      
      let hadir = 0;
      let sedangIstirahat = 0;

      for (const staffId of stafUnik) {
        const absensiPerson = absensiDivisi.filter(a => a.staff_id === staffId);
        const sudahMasuk = absensiPerson.some(a => a.jenis === JenisAbsensi.MASUK);
        const sudahKeluar = absensiPerson.some(a => a.jenis === JenisAbsensi.KELUAR);
        
        const countMulaiIstirahat = absensiPerson.filter(a => a.jenis === JenisAbsensi.MULAI_ISTIRAHAT).length;
        const countSelesaiIstirahat = absensiPerson.filter(a => a.jenis === JenisAbsensi.SELESAI_ISTIRAHAT).length;
        const isIstirahat = countMulaiIstirahat > countSelesaiIstirahat;

        if (sudahMasuk && !sudahKeluar) {
          hadir++;
          if (isIstirahat) sedangIstirahat++;
        }
      }

      perDivisi[div] = {
        hadir,
        tidakHadir: totalStaff - hadir,
        istirahat: sedangIstirahat,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        keamanan: perDivisi[Divisi.KEAMANAN],
        cs: perDivisi[Divisi.CUSTOMER_SERVICE],
        utility: perDivisi[Divisi.UTILITY],
        pending: {
          laporan: laporanPending,
          barangRusak: totalBarangBermasalah,
        }
      },
    });
  } catch (error) {
    logger.error('Error getDashboardSummary:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getLiveTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Ambil absensi masuk dan istirahat terbaru untuk staff lapangan
    const absensiHariIni = await prisma.absensi.findMany({
      where: { waktu_server: { gte: today, lte: endOfDay } },
      include: {
        staff: { select: { id: true, nama: true, divisi: true, role: true } },
      },
      orderBy: { waktu_server: 'asc' },
    });

    const stafUnik = [...new Set(absensiHariIni.map(a => a.staff_id))];
    const liveTracking = [];

    for (const staffId of stafUnik) {
      const records = absensiHariIni.filter(a => a.staff_id === staffId);
      const masuk = records.find(a => a.jenis === JenisAbsensi.MASUK);
      const keluar = records.find(a => a.jenis === JenisAbsensi.KELUAR);
      
      // Hanya tampilkan jika sedang aktif shift (sudah masuk, belum keluar)
      if (masuk && !keluar) {
        // Cari status istirahat
        const mulaiIstirahat = records.filter(a => a.jenis === JenisAbsensi.MULAI_ISTIRAHAT).length;
        const selesaiIstirahat = records.filter(a => a.jenis === JenisAbsensi.SELESAI_ISTIRAHAT).length;
        const isIstirahat = mulaiIstirahat > selesaiIstirahat;

        // Ambil lokasi terakhir (bisa dari absen masuk atau istirahat)
        const lastRecord = records[records.length - 1];

        liveTracking.push({
          staff_id: lastRecord.staff.id,
          nama: lastRecord.staff.nama,
          divisi: lastRecord.staff.divisi,
          role: lastRecord.staff.role,
          lat: lastRecord.lat,
          lng: lastRecord.lng,
          updated_at: lastRecord.waktu_server,
          status_absensi: isIstirahat ? 'ISTIRAHAT' : 'BEKERJA',
        });
      }
    }

    res.status(200).json({ success: true, data: liveTracking });
  } catch (error) {
    logger.error('Error getLiveTracking:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getDashboardChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const chartData = [];
    const divNames = ['KEAMANAN', 'CUSTOMER_SERVICE', 'UTILITY'];
    const displayNames: any = {
      'KEAMANAN': 'Keamanan',
      'CUSTOMER_SERVICE': 'CS',
      'UTILITY': 'Utility'
    };

    for (const date of last7Days) {
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const absensiHariIni = await prisma.absensi.findMany({
        where: {
          waktu_server: { gte: date, lte: endOfDay },
          jenis: 'MASUK'
        },
        include: { staff: true }
      });

      const dayData: any = {
        name: date.toLocaleDateString('id-ID', { weekday: 'short' })
      };

      for (const div of divNames) {
        const stafHadir = new Set(absensiHariIni.filter(a => a.staff.divisi === div).map(a => a.staff_id));
        dayData[displayNames[div]] = stafHadir.size;
      }

      chartData.push(dayData);
    }

    res.status(200).json({ success: true, data: chartData });
  } catch (error) {
    logger.error('Error getDashboardChart:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getDashboardActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ambil 10 absensi terakhir
    const absensiRecords = await prisma.absensi.findMany({
      take: 10,
      orderBy: { waktu_server: 'desc' },
      include: { staff: { select: { nama: true, role: true } } }
    });

    // Ambil 10 laporan terakhir
    const laporanRecords = await prisma.laporan.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { pembuat: { select: { nama: true, role: true } } }
    });

    const activities = [];

    for (const a of absensiRecords) {
      activities.push({
        id: `abs-${a.id}`,
        nama: a.staff.nama,
        role: a.staff.role,
        waktu: a.waktu_server.toISOString(),
        aksi: `Melakukan absensi ${a.jenis.replace('_', ' ')}`
      });
    }

    for (const l of laporanRecords) {
      activities.push({
        id: `lap-${l.id}`,
        nama: l.pembuat.nama,
        role: l.pembuat.role,
        waktu: l.created_at.toISOString(),
        aksi: `Mengirim laporan: ${l.kategori}`
      });
    }

    activities.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
    const topActivities = activities.slice(0, 10);

    res.status(200).json({ success: true, data: topActivities });
  } catch (error) {
    logger.error('Error getDashboardActivities:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getStatistikKehadiran = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = getStatistikSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { bulan, tahun, divisi } = parsed.data;
    const b = bulan || new Date().getMonth() + 1;
    const t = tahun || new Date().getFullYear();

    const startDate = new Date(t, b - 1, 1);
    const endDate = new Date(t, b, 0, 23, 59, 59, 999);

    const whereStaff: any = { aktif: true };
    if (divisi) whereStaff.divisi = divisi;

    const staffList = await prisma.staff.findMany({ where: whereStaff, select: { id: true, nama: true, divisi: true } });
    const absensiList = await prisma.absensi.findMany({
      where: {
        staff_id: { in: staffList.map(s => s.id) },
        waktu_server: { gte: startDate, lte: endDate },
      },
      orderBy: { waktu_server: 'asc' },
    });

    const statistik = staffList.map(staff => {
      const records = absensiList.filter(a => a.staff_id === staff.id);
      
      // Kelompokkan per hari
      const perHari: Record<string, any[]> = {};
      records.forEach(r => {
        const d = r.waktu_server.toISOString().split('T')[0];
        if (!perHari[d]) perHari[d] = [];
        perHari[d].push(r);
      });

      let totalHadir = 0;
      let totalMenitKerja = 0;

      for (const dateKey in perHari) {
        const rHari = perHari[dateKey];
        const masuk = rHari.find(a => a.jenis === JenisAbsensi.MASUK);
        const keluar = rHari.find(a => a.jenis === JenisAbsensi.KELUAR);

        if (masuk && keluar) {
          totalHadir++;
          // Hitung durasi kotor dalam menit
          let durasiMenit = (keluar.waktu_server.getTime() - masuk.waktu_server.getTime()) / 60000;

          // Kurangi istirahat
          const istirahatMulai = rHari.filter(a => a.jenis === JenisAbsensi.MULAI_ISTIRAHAT);
          const istirahatSelesai = rHari.filter(a => a.jenis === JenisAbsensi.SELESAI_ISTIRAHAT);

          let totalMenitIstirahat = 0;
          for (let i = 0; i < Math.min(istirahatMulai.length, istirahatSelesai.length); i++) {
            totalMenitIstirahat += (istirahatSelesai[i].waktu_server.getTime() - istirahatMulai[i].waktu_server.getTime()) / 60000;
          }

          durasiMenit = durasiMenit - totalMenitIstirahat;
          if (durasiMenit > 0) totalMenitKerja += durasiMenit;
        }
      }

      const rataMenitPerHari = totalHadir > 0 ? totalMenitKerja / totalHadir : 0;

      return {
        staff_id: staff.id,
        nama: staff.nama,
        divisi: staff.divisi,
        total_hadir: totalHadir,
        total_jam_kerja: (totalMenitKerja / 60).toFixed(2),
        rata_jam_per_hari: (rataMenitPerHari / 60).toFixed(2),
      };
    });

    res.status(200).json({ success: true, data: statistik });
  } catch (error) {
    logger.error('Error getStatistikKehadiran:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const exportAbsensiCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = exportAbsensiSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { bulan, tahun, divisi } = parsed.data;
    const b = bulan || new Date().getMonth() + 1;
    const t = tahun || new Date().getFullYear();

    const startDate = new Date(t, b - 1, 1);
    const endDate = new Date(t, b, 0, 23, 59, 59, 999);

    const where: any = { waktu_server: { gte: startDate, lte: endDate } };
    if (divisi) {
      where.staff = { divisi };
    }

    const absensi = await prisma.absensi.findMany({
      where,
      include: { staff: { select: { nama: true, nik: true, divisi: true } } },
      orderBy: [{ waktu_server: 'desc' }],
    });

    const csvData = absensi.map(a => ({
      NIK: a.staff.nik,
      Nama: a.staff.nama,
      Divisi: a.staff.divisi,
      'Jenis Absensi': a.jenis,
      Waktu: a.waktu_server.toISOString(),
      Latitude: a.lat,
      Longitude: a.lng,
      Catatan: a.catatan || '',
    }));

    const csv = Papa.unparse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=absensi-${t}-${b}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exportAbsensiCsv:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat export CSV.' });
  }
};

// ─── MASTER DATA: STAFF ───────────────────────────────────────────────────────

export const getAllStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staff.findMany({
      select: { id: true, nik: true, nama: true, role: true, divisi: true, aktif: true, foto_profil: true, area_tugas_id: true, area_tugas: true },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { nik, nama, password, role, divisi, area_tugas_id, aktif } = parsed.data;

    const existing = await prisma.staff.findUnique({ where: { nik } });
    if (existing) {
      res.status(400).json({ success: false, message: 'NIK sudah terdaftar.' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const staff = await prisma.staff.create({
      data: { nik, nama, password_hash, role, divisi, area_tugas_id, aktif },
      select: { id: true, nik: true, nama: true, role: true, divisi: true },
    });

    res.status(201).json({ success: true, message: 'Staff berhasil ditambahkan.', data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const data: any = { ...parsed.data };
    if (data.password) {
      data.password_hash = await bcrypt.hash(data.password, 12);
      delete data.password;
    }

    const staff = await prisma.staff.update({
      where: { id },
      data,
      select: { id: true, nik: true, nama: true, role: true, divisi: true, aktif: true },
    });

    res.status(200).json({ success: true, message: 'Staff berhasil diupdate.', data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const toggleStaffAktif = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      res.status(404).json({ success: false, message: 'Staff tidak ditemukan.' });
      return;
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: { aktif: !staff.aktif },
      select: { id: true, nama: true, aktif: true },
    });

    res.status(200).json({ success: true, message: `Status staff berhasil diubah.`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── MASTER DATA: AREA TUGAS ──────────────────────────────────────────────────

export const getAllAreaTugas = async (req: Request, res: Response): Promise<void> => {
  try {
    const area = await prisma.areaTugas.findMany({ orderBy: { nama: 'asc' } });
    res.status(200).json({ success: true, data: area });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const createAreaTugas = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createAreaTugasSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const area = await prisma.areaTugas.create({ data: parsed.data });
    res.status(201).json({ success: true, message: 'Area tugas berhasil ditambahkan.', data: area });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const updateAreaTugas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateAreaTugasSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const existing = await prisma.areaTugas.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Area Tugas tidak ditemukan.' });
      return;
    }

    const areaTugas = await prisma.areaTugas.update({
      where: { id },
      data: parsed.data,
    });

    res.status(200).json({ success: true, message: 'Area tugas berhasil diperbarui.', data: areaTugas });
  } catch (error) {
    logger.error('Error updateAreaTugas:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const broadcastNotifikasi = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = broadcastNotifikasiSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { judul, pesan, divisi, role } = parsed.data;

    if (divisi) {
      await sendToDivisi(divisi, judul, pesan, { type: 'broadcast_admin' });
    } else if (role) {
      await sendToRole(role, judul, pesan, { type: 'broadcast_admin' });
    } else {
      // Broadcast ke semua staff
      const staffList = await prisma.staff.findMany({
        where: { aktif: true, fcm_token: { not: null } },
        select: { fcm_token: true },
      });
      const tokens = staffList.map(s => s.fcm_token as string);
      await sendMulticast(tokens, judul, pesan, { type: 'broadcast_admin' });
    }

    res.status(200).json({ success: true, message: 'Broadcast notifikasi berhasil dikirim.' });
  } catch (error) {
    logger.error('Error broadcastNotifikasi:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};
