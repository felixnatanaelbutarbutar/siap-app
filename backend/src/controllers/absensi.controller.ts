import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { koordinatSchema, getRiwayatSchema, getAdminAbsensiSchema } from '../schemas/absensi.schema';
import { uploadFile } from '../services/storage.service';
import { addWatermark, WatermarkData } from '../services/watermark.service';
import { getDistance } from 'geolib';
import { getIO } from '../lib/socket';
import { logger } from '../utils/logger';
import { JenisAbsensi } from '@prisma/client';
import { format } from 'date-fns';

/**
 * Validasi GPS: Hitung jarak dari area_tugas dan cek akurasi
 */
const validateGps = (lat: number, lng: number, akurasi: number | undefined, area: any) => {
  if (akurasi && akurasi > 50) {
    throw new Error(`Akurasi GPS terlalu rendah (${akurasi} meter). Harap cari sinyal GPS yang lebih baik.`);
  }

  const jarak = getDistance(
    { latitude: lat, longitude: lng },
    { latitude: area.lat, longitude: area.lng }
  );

  if (jarak > area.radius_meter) {
    throw new Error(`Anda berada ${jarak} meter di luar area tugas. Maksimal radius adalah ${area.radius_meter} meter.`);
  }
};

/**
 * Cek apakah staff sedang aktif shift (sudah masuk tapi belum keluar)
 */
const checkShiftAktif = async (staffId: string) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const absensiHariIni = await prisma.absensi.findMany({
    where: {
      staff_id: staffId,
      waktu_server: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { waktu_server: 'asc' },
  });

  const sudahMasuk = absensiHariIni.some((a) => a.jenis === JenisAbsensi.MASUK);
  const sudahKeluar = absensiHariIni.some((a) => a.jenis === JenisAbsensi.KELUAR);

  return { sudahMasuk, sudahKeluar, absensiHariIni };
};

// ─── POST /absensi/masuk ──────────────────────────────────────────────────────
export const absenMasuk = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'Foto absensi wajib disertakan.' });
      return;
    }

    const parsed = koordinatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    const { lat, lng, akurasi_gps } = parsed.data;

    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      include: { area_tugas: true },
    });

    if (!staff || !staff.area_tugas) {
      res.status(400).json({ success: false, message: 'Data staff atau area tugas tidak ditemukan.' });
      return;
    }

    // Validasi GPS
    try {
      validateGps(lat, lng, akurasi_gps, staff.area_tugas);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message, code: 'GPS_VALIDATION_FAILED' });
      return;
    }

    // Business Logic: Cek apakah sudah absen masuk hari ini
    const { sudahMasuk } = await checkShiftAktif(user.id);
    if (sudahMasuk) {
      res.status(400).json({ success: false, message: 'Anda sudah absen masuk hari ini.' });
      return;
    }

    // Proses Watermark
    const waktuSekarang = new Date();
    const watermarkData: WatermarkData = {
      nama: staff.nama,
      divisi: staff.divisi,
      tanggal_jam: format(waktuSekarang, 'dd-MM-yyyy HH:mm:ss'),
      lat,
      lng,
      area_tugas: staff.area_tugas.nama,
    };

    const watermarkedBuffer = await addWatermark(file.buffer, watermarkData);

    // Upload ke MinIO
    const filename = `absensi/${staff.id}/${format(waktuSekarang, 'yyyy-MM-dd')}/${Date.now()}_masuk.jpg`;
    const fotoUrl = await uploadFile(watermarkedBuffer, filename, 'image/jpeg');

    // Simpan ke DB
    const absensi = await prisma.absensi.create({
      data: {
        staff_id: staff.id,
        jenis: JenisAbsensi.MASUK,
        foto_url: fotoUrl,
        lat,
        lng,
        akurasi_gps,
        waktu_server: waktuSekarang,
      },
    });

    // Notify admin
    getIO().to('admin').emit('absensi:new', {
      staff_id: staff.id,
      nama: staff.nama,
      divisi: staff.divisi,
      jenis: JenisAbsensi.MASUK,
      waktu: absensi.waktu_server,
    });

    res.status(200).json({
      success: true,
      message: 'Absen masuk berhasil.',
      data: absensi,
    });
  } catch (error) {
    logger.error('Error absenMasuk:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── POST /absensi/keluar ─────────────────────────────────────────────────────
export const absenKeluar = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'Foto absensi wajib disertakan.' });
      return;
    }

    const parsed = koordinatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    const { lat, lng, akurasi_gps } = parsed.data;

    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      include: { area_tugas: true },
    });

    // Validasi GPS
    if (staff?.area_tugas) {
      try {
        validateGps(lat, lng, akurasi_gps, staff.area_tugas);
      } catch (err: any) {
        res.status(400).json({ success: false, message: err.message, code: 'GPS_VALIDATION_FAILED' });
        return;
      }
    }

    const { sudahMasuk, sudahKeluar } = await checkShiftAktif(user.id);
    if (!sudahMasuk) {
      res.status(400).json({ success: false, message: 'Anda belum absen masuk hari ini.' });
      return;
    }
    if (sudahKeluar) {
      res.status(400).json({ success: false, message: 'Anda sudah absen keluar hari ini.' });
      return;
    }

    // Proses Watermark
    const waktuSekarang = new Date();
    const watermarkData: WatermarkData = {
      nama: staff!.nama,
      divisi: staff!.divisi,
      tanggal_jam: format(waktuSekarang, 'dd-MM-yyyy HH:mm:ss'),
      lat,
      lng,
      area_tugas: staff?.area_tugas?.nama || 'Unknown Area',
    };

    const watermarkedBuffer = await addWatermark(file.buffer, watermarkData);

    const filename = `absensi/${staff!.id}/${format(waktuSekarang, 'yyyy-MM-dd')}/${Date.now()}_keluar.jpg`;
    const fotoUrl = await uploadFile(watermarkedBuffer, filename, 'image/jpeg');

    const absensi = await prisma.absensi.create({
      data: {
        staff_id: staff!.id,
        jenis: JenisAbsensi.KELUAR,
        foto_url: fotoUrl,
        lat,
        lng,
        akurasi_gps,
        waktu_server: waktuSekarang,
      },
    });

    // Notify admin
    getIO().to('admin').emit('absensi:new', {
      staff_id: staff!.id,
      nama: staff!.nama,
      divisi: staff!.divisi,
      jenis: JenisAbsensi.KELUAR,
      waktu: absensi.waktu_server,
    });

    res.status(200).json({
      success: true,
      message: 'Absen keluar berhasil.',
      data: absensi,
    });
  } catch (error) {
    logger.error('Error absenKeluar:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── POST /absensi/mulai-istirahat ────────────────────────────────────────────
export const mulaiIstirahat = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = koordinatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    const { lat, lng } = parsed.data;

    const { sudahMasuk, sudahKeluar, absensiHariIni } = await checkShiftAktif(user.id);
    if (!sudahMasuk || sudahKeluar) {
      res.status(400).json({ success: false, message: 'Tidak dapat istirahat saat tidak dalam shift.' });
      return;
    }

    const sedangIstirahat = absensiHariIni.filter(a => a.jenis === JenisAbsensi.MULAI_ISTIRAHAT).length > 
                            absensiHariIni.filter(a => a.jenis === JenisAbsensi.SELESAI_ISTIRAHAT).length;
                            
    if (sedangIstirahat) {
      res.status(400).json({ success: false, message: 'Anda sudah dalam status istirahat.' });
      return;
    }

    const staff = await prisma.staff.findUnique({ where: { id: user.id } });
    const absensi = await prisma.absensi.create({
      data: {
        staff_id: user.id,
        jenis: JenisAbsensi.MULAI_ISTIRAHAT,
        lat,
        lng,
        waktu_server: new Date(),
      },
    });

    // Notify admin
    getIO().to('admin').emit('absensi:new', {
      staff_id: user.id,
      nama: staff!.nama,
      divisi: staff!.divisi,
      jenis: JenisAbsensi.MULAI_ISTIRAHAT,
      waktu: absensi.waktu_server,
    });

    res.status(200).json({ success: true, message: 'Mulai istirahat berhasil.', data: absensi });
  } catch (error) {
    logger.error('Error mulaiIstirahat:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── POST /absensi/selesai-istirahat ──────────────────────────────────────────
export const selesaiIstirahat = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = koordinatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    const { lat, lng } = parsed.data;

    const { sudahMasuk, sudahKeluar, absensiHariIni } = await checkShiftAktif(user.id);
    if (!sudahMasuk || sudahKeluar) {
      res.status(400).json({ success: false, message: 'Shift tidak aktif.' });
      return;
    }

    const sedangIstirahat = absensiHariIni.filter(a => a.jenis === JenisAbsensi.MULAI_ISTIRAHAT).length > 
                            absensiHariIni.filter(a => a.jenis === JenisAbsensi.SELESAI_ISTIRAHAT).length;
                            
    if (!sedangIstirahat) {
      res.status(400).json({ success: false, message: 'Anda tidak sedang istirahat.' });
      return;
    }

    const staff = await prisma.staff.findUnique({ where: { id: user.id } });
    const absensi = await prisma.absensi.create({
      data: {
        staff_id: user.id,
        jenis: JenisAbsensi.SELESAI_ISTIRAHAT,
        lat,
        lng,
        waktu_server: new Date(),
      },
    });

    // Notify admin
    getIO().to('admin').emit('absensi:new', {
      staff_id: user.id,
      nama: staff!.nama,
      divisi: staff!.divisi,
      jenis: JenisAbsensi.SELESAI_ISTIRAHAT,
      waktu: absensi.waktu_server,
    });

    res.status(200).json({ success: true, message: 'Selesai istirahat berhasil.', data: absensi });
  } catch (error) {
    logger.error('Error selesaiIstirahat:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── GET /absensi/hari-ini ────────────────────────────────────────────────────
export const getAbsensiHariIni = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { absensiHariIni } = await checkShiftAktif(user.id);

    res.status(200).json({
      success: true,
      data: absensiHariIni,
    });
  } catch (error) {
    logger.error('Error getAbsensiHariIni:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── GET /absensi/riwayat ─────────────────────────────────────────────────────
export const getRiwayatAbsensi = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = getRiwayatSchema.safeParse(req.query);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Parameter pencarian tidak valid.' });
      return;
    }
    
    const bulan = parsed.data.bulan || new Date().getMonth() + 1;
    const tahun = parsed.data.tahun || new Date().getFullYear();

    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    const riwayat = await prisma.absensi.findMany({
      where: {
        staff_id: user.id,
        waktu_server: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { waktu_server: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: riwayat,
    });
  } catch (error) {
    logger.error('Error getRiwayatAbsensi:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};

// ─── GET /admin/absensi ───────────────────────────────────────────────────────
export const getAdminAbsensi = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = getAdminAbsensiSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Parameter tidak valid.' });
      return;
    }

    const { tanggal, staff_id, divisi } = parsed.data;

    const where: any = {};
    if (staff_id) where.staff_id = staff_id;
    if (divisi) {
      where.staff = { divisi };
    }

    if (tanggal) {
      const date = new Date(tanggal);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.waktu_server = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const absensi = await prisma.absensi.findMany({
      where,
      include: {
        staff: {
          select: { nama: true, nik: true, divisi: true, role: true },
        },
      },
      orderBy: { waktu_server: 'desc' },
      take: 200,
    });

    res.status(200).json({
      success: true,
      data: absensi,
    });
  } catch (error) {
    logger.error('Error getAdminAbsensi:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
  }
};
