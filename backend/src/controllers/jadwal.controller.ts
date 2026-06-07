import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HariKerja } from '@prisma/client';

export const getJadwal = async (req: Request, res: Response) => {
  try {
    const { divisi, staff_id } = req.query;
    
    let whereClause: any = {};
    if (staff_id && staff_id !== 'SEMUA') {
      whereClause.staff_id = staff_id;
    } else if (divisi && divisi !== 'SEMUA') {
      whereClause.staff = { divisi: divisi as any };
    }

    const jadwalList = await prisma.jadwalKerja.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            nama: true,
            nik: true,
            divisi: true,
            role: true
          }
        }
      },
      orderBy: [
        { staff: { nama: 'asc' } },
        { hari: 'asc' } // Note: Prisma might not order enum values perfectly by week day, but it's acceptable for now
      ]
    });

    res.json({ success: true, data: jadwalList });
  } catch (error) {
    console.error('Error get jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data jadwal' });
  }
};

export const createJadwal = async (req: Request, res: Response) => {
  try {
    const { staff_id, hari, jam_masuk, jam_keluar } = req.body;

    // Validate if the schedule for this day already exists
    const existing = await prisma.jadwalKerja.findUnique({
      where: { staff_id_hari: { staff_id, hari } }
    });

    if (existing) {
      res.status(400).json({ success: false, message: `Jadwal untuk hari ${hari} sudah ada.` });
      return;
    }

    const newJadwal = await prisma.jadwalKerja.create({
      data: { staff_id, hari, jam_masuk, jam_keluar }
    });

    res.status(201).json({ success: true, data: newJadwal, message: 'Jadwal berhasil dibuat' });
  } catch (error) {
    console.error('Error create jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat jadwal' });
  }
};

export const updateJadwal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { jam_masuk, jam_keluar, aktif } = req.body;

    const updatedJadwal = await prisma.jadwalKerja.update({
      where: { id },
      data: { jam_masuk, jam_keluar, aktif }
    });

    res.json({ success: true, data: updatedJadwal, message: 'Jadwal berhasil diperbarui' });
  } catch (error) {
    console.error('Error update jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate jadwal' });
  }
};

export const deleteJadwal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.jadwalKerja.delete({ where: { id } });
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error('Error delete jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus jadwal' });
  }
};

export const getRekapJadwal = async (req: Request, res: Response) => {
  try {
    const { bulan, tahun, divisi } = req.query;
    
    if (!bulan || !tahun) {
      res.status(400).json({ success: false, message: 'Bulan dan tahun harus diisi' });
      return;
    }

    const startOfMonth = new Date(Number(tahun), Number(bulan) - 1, 1);
    const endOfMonth = new Date(Number(tahun), Number(bulan), 0, 23, 59, 59, 999);

    // Get Pengaturan for toleransi
    const pengaturan = await prisma.pengaturanSistem.findUnique({ where: { id: 'singleton' } });
    const toleransi = pengaturan?.toleransi_keterlambatan_menit || 15;

    // Build staff filter
    let staffWhere: any = {};
    if (divisi && divisi !== 'SEMUA') {
      staffWhere.divisi = divisi as any;
    }

    // Get all staff with their schedules
    const staffList = await prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        nama: true,
        divisi: true,
        jadwal_kerja: { where: { aktif: true } }
      }
    });

    // Process each staff
    const rekap = await Promise.all(staffList.map(async (staff) => {
      // If no schedule, return basic stats
      if (staff.jadwal_kerja.length === 0) {
        return {
          staff_id: staff.id,
          nama: staff.nama,
          divisi: staff.divisi,
          total_jadwal_hari: 0,
          total_jam_kerja_terjadwal: 0,
          total_kehadiran: 0,
          total_jam_aktual: 0,
          total_terlambat: 0,
          detail_terlambat: []
        };
      }

      // Calculate scheduled hours per day mapping
      const jadwalMap = new Map();
      let totalJamKerjaTerjadwalMingguan = 0;
      
      for (const j of staff.jadwal_kerja) {
        // Map enum to JS day index (0=Sunday, 1=Monday, etc)
        const dayMap: Record<string, number> = { 'AHAD': 0, 'SENIN': 1, 'SELASA': 2, 'RABU': 3, 'KAMIS': 4, 'JUMAT': 5, 'SABTU': 6 };
        const jsDay = dayMap[j.hari];
        
        let [mH, mM] = j.jam_masuk.split(':').map(Number);
        let [kH, kM] = j.jam_keluar.split(':').map(Number);
        
        let durasi = (kH + kM/60) - (mH + mM/60);
        if (durasi < 0) durasi += 24; // Cross midnight shift
        
        totalJamKerjaTerjadwalMingguan += durasi;
        jadwalMap.set(jsDay, { jam_masuk: j.jam_masuk, durasi });
      }

      // Estimate monthly scheduled hours (rough approx based on days in month)
      let totalJamKerjaTerjadwalBulan = 0;
      let totalJadwalHari = 0;
      for (let d = 1; d <= endOfMonth.getDate(); d++) {
        const date = new Date(Number(tahun), Number(bulan) - 1, d);
        if (jadwalMap.has(date.getDay())) {
          totalJamKerjaTerjadwalBulan += jadwalMap.get(date.getDay()).durasi;
          totalJadwalHari++;
        }
      }

      // Get absensi for this month
      const absensi = await prisma.absensi.findMany({
        where: {
          staff_id: staff.id,
          waktu_server: { gte: startOfMonth, lte: endOfMonth }
        },
        orderBy: { waktu_server: 'asc' }
      });

      // Group absensi by date
      const absensiByDate = new Map();
      for (const a of absensi) {
        const dateStr = a.waktu_server.toISOString().split('T')[0];
        if (!absensiByDate.has(dateStr)) absensiByDate.set(dateStr, []);
        absensiByDate.get(dateStr).push(a);
      }

      let totalKehadiran = 0;
      let totalJamAktual = 0;
      let totalTerlambat = 0;
      const detailTerlambat = [];

      for (const [dateStr, records] of absensiByDate.entries()) {
        const date = new Date(dateStr);
        const jsDay = date.getDay();
        
        const masukRecord = records.find((r: any) => r.jenis === 'MASUK');
        const keluarRecord = records.find((r: any) => r.jenis === 'KELUAR');

        if (masukRecord) {
          totalKehadiran++;

          // Check if scheduled on this day
          if (jadwalMap.has(jsDay)) {
            const jadwalInfo = jadwalMap.get(jsDay);
            const jadwalMasuk = jadwalInfo.jam_masuk;
            
            const actualTimeStr = masukRecord.waktu_server.toISOString().split('T')[1].substring(0, 5); // HH:mm
            
            // Calculate lateness
            const [jH, jM] = jadwalMasuk.split(':').map(Number);
            const [aH, aM] = actualTimeStr.split(':').map(Number);
            
            const jadwalMinutes = jH * 60 + jM;
            const actualMinutes = aH * 60 + aM;
            
            const diffMinutes = actualMinutes - jadwalMinutes;
            
            if (diffMinutes > toleransi) {
              totalTerlambat++;
              detailTerlambat.push({
                tanggal: dateStr,
                jadwal: jadwalMasuk,
                aktual: actualTimeStr,
                keterlambatan_menit: diffMinutes
              });
            }
          }

          // Calculate actual hours if keluar exists
          if (keluarRecord) {
            const mTime = masukRecord.waktu_server.getTime();
            const kTime = keluarRecord.waktu_server.getTime();
            const durasiJam = (kTime - mTime) / (1000 * 60 * 60);
            totalJamAktual += durasiJam;
          }
        }
      }

      return {
        staff_id: staff.id,
        nama: staff.nama,
        divisi: staff.divisi,
        total_jadwal_hari: totalJadwalHari,
        total_jam_kerja_terjadwal: Math.round(totalJamKerjaTerjadwalBulan),
        total_kehadiran: totalKehadiran,
        total_jam_aktual: Math.round(totalJamAktual),
        total_terlambat: totalTerlambat,
        detail_terlambat: detailTerlambat
      };
    }));

    res.json({ success: true, data: rekap });

  } catch (error) {
    console.error('Error get rekap jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil rekap jadwal' });
  }
};

export const getPengaturan = async (req: Request, res: Response) => {
  try {
    let pengaturan = await prisma.pengaturanSistem.findUnique({ where: { id: 'singleton' } });
    if (!pengaturan) {
      pengaturan = await prisma.pengaturanSistem.create({ data: { id: 'singleton', toleransi_keterlambatan_menit: 15 } });
    }
    res.json({ success: true, data: pengaturan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan' });
  }
};

export const updatePengaturan = async (req: Request, res: Response) => {
  try {
    const { toleransi_keterlambatan_menit } = req.body;
    const pengaturan = await prisma.pengaturanSistem.upsert({
      where: { id: 'singleton' },
      update: { toleransi_keterlambatan_menit },
      create: { id: 'singleton', toleransi_keterlambatan_menit }
    });
    res.json({ success: true, data: pengaturan });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate pengaturan' });
  }
};
