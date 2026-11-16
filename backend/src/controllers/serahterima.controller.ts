import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { uploadFile, downloadFile } from '../services/storage.service';
import { generateAndUploadBAST, BASTData } from '../services/pdf.service';
import { getIO } from '../lib/socket';
import { 
  mulaiSerahTerimaSchema, 
  konfirmasiSerahTerimaSchema,
  getAdminSerahTerimaSchema
} from '../schemas/serah-terima.schema';
import { StatusSerahTerima, JenisSerahTerima, Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ─── POST /serah-terima/mulai ────────────────────────────────────────────────
export const mulaiSerahTerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = mulaiSerahTerimaSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { jenis, staff_baru_id, barang_list, catatan, foto_urls, ttd_lama } = parsed.data;

    // Validasi apakah user boleh melakukan jenis serah terima ini
    if (jenis === JenisSerahTerima.PIKET && user.role !== Role.SATPAM) {
      res.status(403).json({ success: false, message: 'Serah terima PIKET hanya untuk SATPAM.' });
      return;
    }
    if (jenis === JenisSerahTerima.PERALATAN && user.role !== Role.UTILITY) {
      res.status(403).json({ success: false, message: 'Serah terima PERALATAN hanya untuk UTILITY.' });
      return;
    }

    // Validasi staff penerima
    const staffBaru = await prisma.staff.findUnique({ where: { id: staff_baru_id } });
    if (!staffBaru) {
      res.status(404).json({ success: false, message: 'Staff penerima tidak ditemukan.' });
      return;
    }

    // Pastikan staff_baru_id memiliki role yang sama dengan jenis serah terima
    if (jenis === JenisSerahTerima.PIKET && staffBaru.role !== Role.SATPAM) {
      res.status(400).json({ success: false, message: 'Penerima serah terima PIKET harus SATPAM.' });
      return;
    }
    if (jenis === JenisSerahTerima.PERALATAN && staffBaru.role !== Role.UTILITY) {
      res.status(400).json({ success: false, message: 'Penerima serah terima PERALATAN harus UTILITY.' });
      return;
    }

    // Upload TTD Lama (base64) ke MinIO agar tersimpan
    const idSerahTerima = uuidv4();
    let ttdLamaUrl = '';
    
    try {
      const ttdBuffer = Buffer.from(ttd_lama.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      ttdLamaUrl = await uploadFile(ttdBuffer, `tanda-tangan/${idSerahTerima}/penyerah.png`, 'image/png');
    } catch (e) {
      res.status(400).json({ success: false, message: 'Format tanda tangan tidak valid.' });
      return;
    }

    const shiftDate = new Date();
    shiftDate.setHours(0, 0, 0, 0);

    const serahTerima = await prisma.serahTerima.create({
      data: {
        id: idSerahTerima,
        staff_lama_id: user.id,
        staff_baru_id: staff_baru_id,
        jenis,
        shift_date: shiftDate,
        barang_list: barang_list,
        catatan,
        foto_urls,
        ttd_lama_url: ttdLamaUrl,
        // Menyimpan base64 as-is ke file BAST bisa langsung dari JSON (atau dari storage),
        // Tapi kita simpan sementara di database jika ingin generate PDF nanti, namun lebih baik langsung generate BAST nanti saat konfirmasi
        status: StatusSerahTerima.PENDING,
      },
    });

    const staffLama = await prisma.staff.findUnique({ where: { id: user.id } });

    // Notify admin
    getIO().to('admin').emit('serah_terima:new', {
      staff_id: user.id,
      nama: staffLama!.nama,
      divisi: staffLama!.divisi,
      jenis,
    });

    res.status(201).json({ 
      success: true, 
      message: 'Serah terima berhasil dimulai. Menunggu konfirmasi penerima.', 
      data: serahTerima 
    });
  } catch (error) {
    logger.error('Error mulaiSerahTerima:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── POST /serah-terima/:id/konfirmasi ──────────────────────────────────────
export const konfirmasiSerahTerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const parsed = konfirmasiSerahTerimaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { ttd_baru } = parsed.data;

    const serahTerima = await prisma.serahTerima.findUnique({
      where: { id },
      include: {
        staff_lama: { select: { nama: true, divisi: true } },
        staff_baru: { select: { nama: true } },
      },
    });

    if (!serahTerima) {
      res.status(404).json({ success: false, message: 'Data serah terima tidak ditemukan.' });
      return;
    }

    if (serahTerima.staff_baru_id !== user.id) {
      res.status(403).json({ success: false, message: 'Hanya staff penerima yang dapat mengkonfirmasi.' });
      return;
    }

    if (serahTerima.status === StatusSerahTerima.SELESAI) {
      res.status(400).json({ success: false, message: 'Serah terima ini sudah dikonfirmasi.' });
      return;
    }

    // Upload TTD Baru
    let ttdBaruUrl = '';
    try {
      const ttdBuffer = Buffer.from(ttd_baru.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      ttdBaruUrl = await uploadFile(ttdBuffer, `tanda-tangan/${id}/penerima.png`, 'image/png');
    } catch (e) {
      res.status(400).json({ success: false, message: 'Format tanda tangan penerima tidak valid.' });
      return;
    }

    // Ambil TTD Lama: gunakan req.body.ttd_lama jika disediakan, atau unduh langsung dari MinIO
    let ttd_lama = typeof req.body.ttd_lama === 'string' ? req.body.ttd_lama : '';
    if (!ttd_lama && serahTerima.ttd_lama_url) {
      try {
        const ttdLamaBuffer = await downloadFile(serahTerima.ttd_lama_url);
        ttd_lama = `data:image/png;base64,${ttdLamaBuffer.toString('base64')}`;
      } catch (downloadErr) {
        logger.warn(`Gagal mengunduh ttd_lama_url untuk BAST ${id}:`, downloadErr);
      }
    }

    // Siapkan data BAST
    const bastData: BASTData = {
      id: serahTerima.id,
      jenis: serahTerima.jenis,
      divisi: serahTerima.staff_lama.divisi,
      tanggal: new Date(),
      staff_lama_nama: serahTerima.staff_lama.nama,
      staff_baru_nama: serahTerima.staff_baru.nama,
      barang_list: serahTerima.barang_list as any[],
      catatan: serahTerima.catatan || undefined,
      ttd_lama_base64: ttd_lama, // Base64 ttd lama
      ttd_baru_base64: ttd_baru, // Base64 ttd baru
    };

    const bastPdfUrl = await generateAndUploadBAST(bastData);

    const updated = await prisma.serahTerima.update({
      where: { id },
      data: {
        ttd_baru_url: ttdBaruUrl,
        bast_pdf_url: bastPdfUrl,
        status: StatusSerahTerima.SELESAI,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Serah terima berhasil dikonfirmasi.',
      data: updated,
    });
  } catch (error) {
    logger.error('Error konfirmasiSerahTerima:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── GET /serah-terima/riwayat ───────────────────────────────────────────────
export const getRiwayatSerahTerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const riwayat = await prisma.serahTerima.findMany({
      where: {
        OR: [
          { staff_lama_id: user.id },
          { staff_baru_id: user.id },
        ],
      },
      include: {
        staff_lama: { select: { id: true, nama: true, nik: true, role: true } },
        staff_baru: { select: { id: true, nama: true, nik: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: riwayat });
  } catch (error) {
    logger.error('Error getRiwayatSerahTerima:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── GET /serah-terima/staff-penerima ───────────────────────────────────────
export const getStaffPenerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const staffList = await prisma.staff.findMany({
      where: {
        aktif: true,
        role: user.role as Role,
        id: { not: user.id },
      },
      select: {
        id: true,
        nama: true,
        nik: true,
        role: true,
        divisi: true,
        foto_profil: true,
      },
      orderBy: { nama: 'asc' },
    });

    res.status(200).json({ success: true, data: staffList });
  } catch (error) {
    logger.error('Error getStaffPenerima:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat daftar staff penerima.' });
  }
};

// ─── GET /serah-terima/:id ───────────────────────────────────────────────────
export const getDetailSerahTerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const st = await prisma.serahTerima.findUnique({
      where: { id },
      include: {
        staff_lama: { select: { id: true, nama: true, nik: true, role: true, divisi: true } },
        staff_baru: { select: { id: true, nama: true, nik: true, role: true, divisi: true } },
      },
    });

    if (!st) {
      res.status(404).json({ success: false, message: 'Data serah terima tidak ditemukan.' });
      return;
    }

    const isAuthorized =
      user.role === Role.ADMIN ||
      st.staff_lama_id === user.id ||
      st.staff_baru_id === user.id;

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke data ini.' });
      return;
    }

    res.status(200).json({ success: true, data: st });
  } catch (error) {
    logger.error('Error getDetailSerahTerima:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── GET /serah-terima/:id/bast ──────────────────────────────────────────────
export const getBastUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const st = await prisma.serahTerima.findUnique({
      where: { id },
      select: {
        staff_lama_id: true,
        staff_baru_id: true,
        bast_pdf_url: true,
        status: true,
      },
    });

    if (!st) {
      res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
      return;
    }

    const isAuthorized =
      user.role === Role.ADMIN ||
      st.staff_lama_id === user.id ||
      st.staff_baru_id === user.id;

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke dokumen BAST ini.' });
      return;
    }

    if (st.status !== StatusSerahTerima.SELESAI || !st.bast_pdf_url) {
      res.status(400).json({ success: false, message: 'BAST belum tersedia (menunggu konfirmasi).' });
      return;
    }

    // Redirect user ke MinIO Public URL
    res.redirect(st.bast_pdf_url);
  } catch (error) {
    logger.error('Error getBastUrl:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── GET /admin/serah-terima ────────────────────────────────────────────────
export const getAdminSerahTerima = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = getAdminSerahTerimaSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Parameter tidak valid.' });
      return;
    }

    const { tanggal, jenis, divisi } = parsed.data;
    const where: any = {};

    if (jenis) where.jenis = jenis;
    if (divisi) where.staff_lama = { divisi };

    if (tanggal) {
      const date = new Date(tanggal);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.shift_date = { gte: startOfDay, lte: endOfDay };
    }

    const st = await prisma.serahTerima.findMany({
      where,
      include: {
        staff_lama: { select: { nama: true, divisi: true } },
        staff_baru: { select: { nama: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    res.status(200).json({ success: true, data: st });
  } catch (error) {
    logger.error('Error getAdminSerahTerima:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// ─── GET /admin/inventaris/bermasalah ───────────────────────────────────────
export const getAdminInventarisBermasalah = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fallback yang lebih aman: Fetch recent serah terima (sebulan terakhir) dan filter di JS
    // karena Prisma JSON filter untuk PostgreSQL sedikit tricky tanpa Raw Query.
    const sebulanLalu = new Date();
    sebulanLalu.setMonth(sebulanLalu.getMonth() - 1);
    
    const recentSt = await prisma.serahTerima.findMany({
      where: { created_at: { gte: sebulanLalu } },
      include: {
        staff_lama: { select: { nama: true, divisi: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const bermasalahList: any[] = [];

    for (const st of recentSt) {
      const barangArr = st.barang_list as any[];
      if (Array.isArray(barangArr)) {
        const issues = barangArr.filter(b => b.kondisi === 'RUSAK' || b.kondisi === 'HILANG');
        if (issues.length > 0) {
          bermasalahList.push({
            serah_terima_id: st.id,
            tanggal: st.created_at,
            divisi: st.staff_lama.divisi,
            penyerah: st.staff_lama.nama,
            barang_bermasalah: issues
          });
        }
      }
    }

    res.status(200).json({ success: true, data: bermasalahList });
  } catch (error) {
    logger.error('Error getAdminInventarisBermasalah:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};
