import { audit, attendanceRows, seedScheduleHistory, saveScheduleVersion, addDays, localDate } from '../services/workforce.service';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getIO } from '../lib/socket';
import { createJadwalSchema, updateJadwalSchema, updatePengaturanSchema } from '../schemas/jadwal.schema';

const notifyScheduleChanged = (staffId: string) => {
  try {
    getIO().to(`staff:${staffId}`).emit('jadwal:updated', { staff_id: staffId });
  } catch {
    // Abaikan jika Socket.io belum siap
  }
};

export const getJadwal = async (req: Request, res: Response) => {
  try {
    const { divisi, staff_id } = req.query;
    
    const whereClause: any = {};
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
    const parsed = createJadwalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { staff_id, hari, jam_masuk, jam_keluar } = parsed.data;

    // Validate if the schedule for this day already exists
    const existing = await prisma.jadwalKerja.findUnique({
      where: { staff_id_hari: { staff_id, hari } }
    });

    if (existing) {
      res.status(400).json({ success: false, message: `Jadwal untuk hari ${hari} sudah ada.` });
      return;
    }

    const newJadwal = await prisma.$transaction(async tx => {
      await seedScheduleHistory(tx, staff_id);
      const row = await tx.jadwalKerja.create({data:{staff_id,hari,jam_masuk,jam_keluar}});
      await saveScheduleVersion(tx,staff_id,req.user!.id,localDate());
      return row;
    });

    notifyScheduleChanged(staff_id);
    res.status(201).json({ success: true, data: newJadwal, message: 'Jadwal berhasil dibuat' });
  } catch (error) {
    console.error('Error create jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat jadwal' });
  }
};

export const updateJadwal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateJadwalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const existing = await prisma.jadwalKerja.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
      return;
    }

    const updatedJadwal = await prisma.$transaction(async tx => {
      await seedScheduleHistory(tx, existing.staff_id);
      const row=await tx.jadwalKerja.update({where:{id},data:parsed.data});
      await saveScheduleVersion(tx,existing.staff_id,req.user!.id,localDate());
      return row;
    });

    notifyScheduleChanged(existing.staff_id);
    res.json({ success: true, data: updatedJadwal, message: 'Jadwal berhasil diperbarui' });
  } catch (error) {
    console.error('Error update jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate jadwal' });
  }
};

export const deleteJadwal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.jadwalKerja.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
      return;
    }
    await prisma.$transaction(async tx=>{
      await seedScheduleHistory(tx,existing.staff_id);
      await tx.jadwalKerja.delete({where:{id}});
      await saveScheduleVersion(tx,existing.staff_id,req.user!.id,localDate());
    });
    notifyScheduleChanged(existing.staff_id);
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error('Error delete jadwal:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus jadwal' });
  }
};

export const getRekapJadwal = async (req: Request, res: Response) => {
  try {
    const year=Number(req.query.tahun||new Date().getFullYear()), month=Number(req.query.bulan||new Date().getMonth()+1);
    if(!Number.isInteger(month)||month<1||month>12||year<2020||year>2100) {res.status(400).json({message:'Periode tidak valid'});return;}
    const from=`${year}-${String(month).padStart(2,'0')}-01`, to=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
    const rows=await attendanceRows(from,to);
    const filtered=rows.filter(r=>!req.query.divisi||req.query.divisi==='SEMUA'||r.divisi===req.query.divisi);
    const data=[...new Set(filtered.map(r=>r.staff_id))].map(staff_id=>{
      const list=filtered.filter(r=>r.staff_id===staff_id); const p=list[0];
      return {staff_id,nama:p.nama,nik:p.nik,divisi:p.divisi,total_jadwal_hari:list.filter(r=>r.source!=='UNSCHEDULED').length,total_kehadiran:list.filter(r=>r.masuk).length,total_jam_aktual:list.reduce((n,r)=>n+(r.jam_aktual||0),0),total_jam_kerja_terjadwal:list.reduce((n,r)=>n+(+r.end_at-+r.start_at)/3600000,0),total_terlambat:list.filter(r=>r.terlambat).length,detail_terlambat:list.filter(r=>r.terlambat).map(r=>({tanggal:r.date,jadwal:r.start_at,aktual:r.masuk,keterlambatan_menit:r.menit_terlambat}))};
    });res.json({success:true,data});
  } catch(error) {res.status(400).json({message:'Gagal menghitung rekap jadwal.'});}
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
    const parsed = updatePengaturanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { toleransi_keterlambatan_menit } = parsed.data;
    const old=await prisma.pengaturanSistem.findUnique({where:{id:'singleton'}});
    await prisma.workforceAudit.upsert({where:{id:'attendance-policy-baseline'},update:{},create:{id:'attendance-policy-baseline',actor_id:'migration',subject_id:'attendance-policy',action:'POLICY_VERSION',reason:'Kebijakan awal',detail:{effective_date:'1900-01-01',tolerance:old?.toleransi_keterlambatan_menit??15}}});
    await audit(prisma,req.user!.id,'attendance-policy','POLICY_VERSION','Perubahan toleransi berlaku mulai besok',{effective_date:addDays(localDate(),1),tolerance:toleransi_keterlambatan_menit});
    const upcoming=await prisma.shiftInstance.findMany({where:{date:{gte:addDays(localDate(),1)}},select:{id:true}});
    const linked=await prisma.absensi.findMany({where:{shift_id:{in:upcoming.map(s=>s.id)}},select:{shift_id:true}});
    await prisma.shiftInstance.updateMany({where:{id:{in:upcoming.filter(s=>!linked.some(e=>e.shift_id===s.id)).map(s=>s.id)}},data:{tolerance:toleransi_keterlambatan_menit}});
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
