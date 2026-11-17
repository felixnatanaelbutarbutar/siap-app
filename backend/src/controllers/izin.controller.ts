import { audit, serial, ensureShifts } from '../services/workforce.service';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { uploadPrivateFile, downloadPrivateFile, downloadFile } from '../services/storage.service';
import { sendToDevice } from '../services/notification.service';
import { createIzinSchema, reviewIzinSchema } from '../schemas/izin.schema';
import { getIO } from '../lib/socket';

// ─── POST /izin (Mobile) ──────────────────────────────────────────────────────
export const createIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parsed = createIzinSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { jenis, tanggal_mulai, tanggal_selesai, keterangan } = parsed.data;

    if (Date.parse(tanggal_selesai)-Date.parse(tanggal_mulai)>366*86400000) { res.status(400).json({message:'Pengajuan maksimal 366 hari.'}); return; }
    const overlap=await prisma.izinCuti.findFirst({where:{staff_id:user.id,status:{in:['PENDING','APPROVED']},tanggal_mulai:{lte:new Date(tanggal_selesai)},tanggal_selesai:{gte:new Date(tanggal_mulai)}}});
    if(overlap){res.status(409).json({message:'Tanggal bertumpuk dengan pengajuan lain.'});return;}
    let foto_url: string | null = null;
    if (req.file) {
      const extension = req.file.originalname.split('.').pop() || 'jpg';
      const filename = `izin/${user.id}_${Date.now()}.${extension}`;
      foto_url = await uploadPrivateFile(req.file.buffer, filename, req.file.mimetype);
    }

    const izin = await prisma.izinCuti.create({
      data: {
        staff_id: user.id,
        jenis,
        tanggal_mulai: new Date(tanggal_mulai),
        tanggal_selesai: new Date(tanggal_selesai),
        keterangan,
        foto_url,
      },
    });

    try {
      getIO().to('admin').emit('izin:new', {
        id: izin.id,
        staff_id: user.id,
        nama: user.nama,
        jenis: izin.jenis,
      });
    } catch {}

    res.status(201).json({ success: true, data: izin });
  } catch (error) {
    logger.error('Error pengajuan izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengajukan izin' });
  }
};

export const getLeaveAttachment = async(req:Request,res:Response):Promise<void> => {
  try {
    const item=await prisma.izinCuti.findUnique({where:{id:req.params.id}});
    if(!item?.foto_url || (req.user!.role!=='ADMIN'&&req.user!.id!==item.staff_id)){res.status(404).json({message:'Lampiran tidak ditemukan.'});return;}
    const file=item.foto_url.startsWith('private:')?await downloadPrivateFile(item.foto_url):{buffer:await downloadFile(item.foto_url),type:'image/jpeg'};
    res.setHeader('Cache-Control','private, no-store');res.type(file.type).send(file.buffer);
  }catch(error){logger.error('Gagal membuka lampiran izin',error);res.status(503).json({message:'Lampiran belum dapat diakses.'});}
};

// ─── GET /izin/saya (Mobile) ──────────────────────────────────────────────────
export const getMyIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const izin = await prisma.izinCuti.findMany({
      where: { staff_id: req.user!.id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: izin });
  } catch (error) {
    logger.error('Error get izin saya:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat riwayat izin' });
  }
};

// ─── GET /admin/izin ──────────────────────────────────────────────────────────
export const getAdminIzin = async (_req: Request, res: Response): Promise<void> => {
  try {
    const izinList = await prisma.izinCuti.findMany({
      include: {
        staff: { select: { nama: true, nik: true, divisi: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: izinList });
  } catch (error) {
    logger.error('Error get admin izin:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data izin' });
  }
};

// ─── PUT /admin/izin/:id ──────────────────────────────────────────────────────
export const reviewIzin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = reviewIzinSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { status, komentar_admin } = parsed.data;

    const izin = await prisma.izinCuti.findUnique({
      where: { id },
      include: { staff: { select: { nama: true, fcm_token: true } } },
    });

    if (!izin) {
      res.status(404).json({ success: false, message: 'Data izin tidak ditemukan.' });
      return;
    }

    const dates=(await ensureShifts(izin.staff_id,izin.tanggal_mulai.toISOString().slice(0,10),izin.tanggal_selesai.toISOString().slice(0,10))).map(s=>s.date);
    const updatedIzin = await serial(async tx=>{
      const current=await tx.izinCuti.findUniqueOrThrow({where:{id}});
      if(current.status!=='PENDING') throw Error('Pengajuan sudah diproses. Muat ulang halaman.');
      if(status==='APPROVED') {
        const overlap=await tx.izinCuti.findFirst({where:{id:{not:id},staff_id:izin.staff_id,status:'APPROVED',tanggal_mulai:{lte:izin.tanggal_selesai},tanggal_selesai:{gte:izin.tanggal_mulai}}});
        if(overlap) throw Error('Pengajuan bertumpuk dengan izin yang sudah disetujui.');
        if(izin.jenis==='CUTI') {
          if(!dates.length) throw Error('Tidak ada jadwal kerja pada periode cuti. Periksa jadwal terlebih dahulu.');
          for(const year of [...new Set(dates.map(d=>Number(d.slice(0,4))))]) {
            const days=dates.filter(d=>Number(d.slice(0,4))===year).length;
            const balance=await tx.leaveLedger.aggregate({where:{staff_id:izin.staff_id,year},_sum:{days:true}});
            if((balance._sum.days??0)<days) throw Error(`Saldo cuti ${year} tidak cukup. Atur hak cuti terlebih dahulu.`);
            await tx.leaveLedger.create({data:{staff_id:izin.staff_id,year,days:-days,kind:'USE',leave_id:id,actor_id:req.user!.id,reason:komentar_admin||'Persetujuan cuti'}});
          }
        }
      }
      const row=await tx.izinCuti.update({where:{id},data:{status,komentar_admin,work_dates:dates,reviewed_by:req.user!.id,reviewed_at:new Date()}});
      await audit(tx,req.user!.id,id,'LEAVE_'+status,komentar_admin||'Keputusan admin',{dates});
      return row;
    });

    if (izin.staff?.fcm_token) {
      const statusLabel = status === 'APPROVED' ? 'Disetujui' : 'Ditolak';
      const title = `Permohonan Izin ${statusLabel}`;
      const body = komentar_admin
        ? `Catatan Admin: ${komentar_admin}`
        : `Permohonan izin Anda telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'} oleh Admin.`;

      try {
        await sendToDevice(izin.staff.fcm_token, title, body, {
          type: 'izin_review',
          izin_id: id,
          status,
        });
      } catch (fcmErr) {
        logger.error('Gagal kirim notif FCM izin:', fcmErr);
      }
    }

    try {
      getIO().to('admin').emit('izin:update', updatedIzin);
      getIO().to(`staff:${izin.staff_id}`).emit('izin:update', updatedIzin);
    } catch {}

    res.json({
      success: true,
      data: updatedIzin,
      message: `Izin berhasil di-${status === 'APPROVED' ? 'setujui' : 'tolak'}.`,
    });
  } catch (error) {
    logger.error('Error update izin:', error);
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Gagal mengupdate status izin' });
  }
};
