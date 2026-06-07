import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { uploadFile } from '../services/storage.service';
import { addWatermark, WatermarkData } from '../services/watermark.service';
import { getIO } from '../lib/socket';
import { sendToRole, sendToDevice } from '../services/notification.service';
// Removed duplicates
import { 
  createLaporanSchema, 
  getLaporanSchema, 
  updateLaporanSchema, 
  reviewLaporanSchema, 
  getAdminLaporanSchema,
  createLaporanPerJamSchema,
  getAdminLaporanPerJamSchema,
  kategoriPerDivisi
} from '../schemas/laporan.schema';
import { StatusLaporan, Divisi, JenisAbsensi, Role } from '@prisma/client';
import { format } from 'date-fns';

// ─── Laporan Harian (Generik) ────────────────────────────────────────────────

export const createLaporan = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const files = req.files as Express.Multer.File[];

    const parsed = createLaporanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { kategori, judul, deskripsi } = parsed.data;

    // Validasi apakah kategori laporan sesuai dengan divisi user
    const divisiUser = user.divisi as Divisi;
    const allowedCategories = kategoriPerDivisi[divisiUser] || [];
    if (!allowedCategories.includes(kategori)) {
      res.status(400).json({ 
        success: false, 
        message: `Kategori ${kategori} tidak valid untuk divisi ${divisiUser}. Pilihan valid: ${allowedCategories.join(', ')}.` 
      });
      return;
    }

    // Ambil data user lengkap
    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      include: { area_tugas: true },
    });

    const fotoUrls: string[] = [];
    const waktuSekarang = new Date();

    // Proses watermark & upload jika ada foto
    if (files && files.length > 0) {
      const watermarkData: WatermarkData = {
        nama: staff!.nama,
        divisi: staff!.divisi,
        tanggal_jam: format(waktuSekarang, 'dd-MM-yyyy HH:mm:ss'),
        lat: 0, // Fallback jika tidak ada koordinat (atau kita bisa mewajibkan lat lng juga)
        lng: 0,
        area_tugas: staff!.area_tugas?.nama || 'Unknown Area',
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const watermarkedBuffer = await addWatermark(file.buffer, watermarkData);
        const filename = `laporan/${user.id}/${format(waktuSekarang, 'yyyy-MM-dd')}/${Date.now()}_${i}.jpg`;
        const url = await uploadFile(watermarkedBuffer, filename, 'image/jpeg');
        fotoUrls.push(url);
      }
    }

    const laporan = await prisma.laporan.create({
      data: {
        staff_id: user.id,
        divisi: divisiUser,
        kategori,
        judul,
        deskripsi,
        foto_urls: fotoUrls,
        status: StatusLaporan.SUBMITTED, // Langsung submitted, tapi bisa DRAFT sesuai UI
      },
    });

    // Notify admin via Socket
    getIO().to('admin').emit('laporan:new', {
      staff_id: user.id,
      nama: staff!.nama,
      divisi: staff!.divisi,
      kategori,
    });

    // Notify admin via FCM
    await sendToRole(
      Role.ADMIN,
      'Laporan Baru Masuk',
      `Terdapat laporan ${kategori} baru dari ${staff!.nama} (Divisi: ${staff!.divisi}).`,
      { type: 'laporan_baru', laporan_id: laporan.id }
    );

    res.status(201).json({ success: true, message: 'Laporan berhasil dibuat.', data: laporan });
  } catch (error) {
    logger.error('Error createLaporan:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getLaporanSaya = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = getLaporanSchema.safeParse(req.query);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Parameter tidak valid.' });
      return;
    }

    const { tanggal } = parsed.data;
    const where: any = { staff_id: user.id };

    if (tanggal) {
      const date = new Date(tanggal);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.created_at = { gte: startOfDay, lte: endOfDay };
    }

    const laporan = await prisma.laporan.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: laporan });
  } catch (error) {
    logger.error('Error getLaporanSaya:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const updateLaporan = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const parsed = updateLaporanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const existing = await prisma.laporan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      return;
    }
    if (existing.staff_id !== user.id) {
      res.status(403).json({ success: false, message: 'Hanya bisa mengedit laporan sendiri.' });
      return;
    }
    if (existing.status !== StatusLaporan.DRAFT) {
      res.status(400).json({ success: false, message: 'Hanya laporan DRAFT yang dapat diedit.' });
      return;
    }

    const laporan = await prisma.laporan.update({
      where: { id },
      data: parsed.data,
    });

    res.status(200).json({ success: true, message: 'Laporan berhasil diperbarui.', data: laporan });
  } catch (error) {
    logger.error('Error updateLaporan:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getAdminLaporan = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = getAdminLaporanSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Parameter tidak valid.' });
      return;
    }

    const { status, tanggal, divisi, staff_id } = parsed.data;
    const where: any = {};

    if (status) where.status = status;
    if (divisi) where.divisi = divisi;
    if (staff_id) where.staff_id = staff_id;
    if (tanggal) {
      const date = new Date(tanggal);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.created_at = { gte: startOfDay, lte: endOfDay };
    }

    const laporan = await prisma.laporan.findMany({
      where,
      include: {
        staff: { select: { nama: true, nik: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    res.status(200).json({ success: true, data: laporan });
  } catch (error) {
    logger.error('Error getAdminLaporan:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const reviewLaporan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = reviewLaporanSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const existing = await prisma.laporan.findUnique({ 
      where: { id },
      include: { staff: { select: { fcm_token: true } } }
    });
    
    if (!existing) {
      res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
      return;
    }

    const laporan = await prisma.laporan.update({
      where: { id },
      data: {
        status: parsed.data.status,
        komentar_admin: parsed.data.komentar,
      },
    });

    // Kirim notifikasi ke staff ybs
    if (existing.staff.fcm_token) {
      const title = `Laporan Anda telah di-${parsed.data.status}`;
      const body = parsed.data.komentar ? `Komentar Admin: ${parsed.data.komentar}` : 'Cek detail laporan Anda.';
      await sendToDevice(existing.staff.fcm_token, title, body, { type: 'laporan_review', laporan_id: laporan.id });
    }

    res.status(200).json({ success: true, message: `Laporan berhasil di-${parsed.data.status}.`, data: laporan });
  } catch (error) {
    logger.error('Error reviewLaporan:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── Laporan Per Jam (Khusus SATPAM) ─────────────────────────────────────────

export const createLaporanPerJam = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'Foto laporan per jam wajib disertakan.' });
      return;
    }

    const parsed = createLaporanPerJamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { jam, status_keamanan, catatan, lat, lng } = parsed.data;
    
    // Cek apakah satpam sedang aktif shift
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const absensiHariIni = await prisma.absensi.findMany({
      where: { staff_id: user.id, waktu_server: { gte: startOfDay, lte: endOfDay } },
    });
    const sudahMasuk = absensiHariIni.some(a => a.jenis === JenisAbsensi.MASUK);
    const sudahKeluar = absensiHariIni.some(a => a.jenis === JenisAbsensi.KELUAR);

    if (!sudahMasuk || sudahKeluar) {
      res.status(400).json({ success: false, message: 'Laporan per jam hanya bisa dibuat saat shift aktif.' });
      return;
    }

    // Cek duplikasi laporan per jam (satu jam hanya satu laporan per staff)
    const existing = await prisma.laporanPerJam.findUnique({
      where: {
        staff_id_tanggal_jam: {
          staff_id: user.id,
          tanggal: startOfDay,
          jam,
        },
      },
    });

    if (existing) {
      res.status(400).json({ success: false, message: `Laporan untuk jam ${jam}:00 sudah pernah dibuat hari ini.` });
      return;
    }

    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      include: { area_tugas: true },
    });

    // Proses watermark & upload
    const waktuSekarang = new Date();
    const watermarkData: WatermarkData = {
      nama: staff!.nama,
      divisi: staff!.divisi,
      tanggal_jam: format(waktuSekarang, 'dd-MM-yyyy HH:mm:ss'),
      lat,
      lng,
      area_tugas: staff!.area_tugas?.nama || 'Unknown Area',
    };

    const watermarkedBuffer = await addWatermark(file.buffer, watermarkData);
    const filename = `laporan-perjam/${user.id}/${format(waktuSekarang, 'yyyy-MM-dd')}/${Date.now()}_jam${jam}.jpg`;
    const fotoUrl = await uploadFile(watermarkedBuffer, filename, 'image/jpeg');

    const laporan = await prisma.laporanPerJam.create({
      data: {
        staff_id: user.id,
        tanggal: startOfDay,
        jam,
        status_keamanan,
        catatan,
        foto_url: fotoUrl,
      },
    });

    res.status(201).json({ success: true, message: 'Laporan per jam berhasil disimpan.', data: laporan });
  } catch (error) {
    logger.error('Error createLaporanPerJam:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getLaporanPerJamSaya = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const tanggalStr = req.query.tanggal as string;
    
    const date = tanggalStr ? new Date(tanggalStr) : new Date();
    date.setHours(0, 0, 0, 0);

    const laporan = await prisma.laporanPerJam.findMany({
      where: {
        staff_id: user.id,
        tanggal: date,
      },
      orderBy: { jam: 'asc' },
    });

    res.status(200).json({ success: true, data: laporan });
  } catch (error) {
    logger.error('Error getLaporanPerJamSaya:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

export const getAdminLaporanPerJam = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = getAdminLaporanPerJamSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { tanggal, staff_id } = parsed.data;
    const date = new Date(tanggal);
    date.setHours(0, 0, 0, 0);

    const where: any = { tanggal: date };
    if (staff_id) where.staff_id = staff_id;

    const laporan = await prisma.laporanPerJam.findMany({
      where,
      include: {
        staff: { select: { nama: true, nik: true } },
      },
      orderBy: [
        { staff_id: 'asc' },
        { jam: 'asc' },
      ],
    });

    // Gap detection (misal shift jam 08:00 - 16:00, mana yang bolong)
    // Untuk ini, logic biasanya lebih kompleks, tapi di sini kita return datanya saja
    // Front-end admin bisa visualisasi timeline dan highlight jam yang bolong.
    
    res.status(200).json({ success: true, data: laporan });
  } catch (error) {
    logger.error('Error getAdminLaporanPerJam:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};
