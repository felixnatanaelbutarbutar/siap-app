import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { safe } from './device.routes';
import { attendanceRows, audit, serial, localDate, daysBetween, ensureShifts } from '../services/workforce.service';

const router=Router();router.use(authenticate,requireRole('ADMIN'));
router.get('/devices',safe(async(_req,res)=>{
  const devices=await prisma.registeredDevice.findMany({orderBy:{created_at:'desc'},select:{id:true,staff_id:true,label:true,status:true,reason:true,reviewed_at:true,created_at:true,last_used_at:true}});
  const staff=await prisma.staff.findMany({select:{id:true,nama:true,nik:true,divisi:true}});
  res.json({data:devices.map(d=>({...d,staff:staff.find(s=>s.id===d.staff_id)}))});
}));
router.post('/devices/:id/review',safe(async(req,res)=>{
  const {status,reason}=z.object({status:z.enum(['APPROVED','REJECTED','REVOKED']),reason:z.string().min(5).max(500)}).parse(req.body);
  await serial(async tx=>{
    const d=await tx.registeredDevice.findUniqueOrThrow({where:{id:req.params.id}});
    if(status==='APPROVED'&&d.status!=='PENDING') throw Error('Hanya permohonan menunggu yang dapat disetujui.');
    if(status==='APPROVED') await tx.registeredDevice.updateMany({where:{staff_id:d.staff_id,status:'APPROVED'},data:{status:'REVOKED',reviewed_by:req.user!.id,reviewed_at:new Date()}});
    await tx.registeredDevice.update({where:{id:d.id},data:{status,reason,reviewed_by:req.user!.id,reviewed_at:new Date()}});
    await audit(tx,req.user!.id,d.id,'DEVICE_'+status,reason,{staff_id:d.staff_id,old_status:d.status});
  }); res.json({success:true});
}));
router.get('/audit/:id',safe(async(req,res)=>{res.json({data:await prisma.workforceAudit.findMany({where:{subject_id:req.params.id},orderBy:{created_at:'desc'}})});}));
router.get('/attendance',safe(async(req,res)=>{
  const from=String(req.query.from||localDate()),to=String(req.query.to||from);
  res.json({data:await attendanceRows(from,to),timezone:'Asia/Jakarta'});
}));
router.post('/attendance/:id/correct',safe(async(req,res)=>{
  const data=z.object({status:z.enum(['HADIR','TIDAK_HADIR','TIDAK_LENGKAP','CUTI','SAKIT','IZIN']),masuk:z.string().datetime().nullable(),keluar:z.string().datetime().nullable(),reason:z.string().min(10).max(1000)}).parse(req.body);
  if(data.keluar&&(!data.masuk||data.keluar<=data.masuk)) throw Error('Jam keluar harus setelah jam masuk.');
  if(data.status==='HADIR'&&(!data.masuk||!data.keluar)) throw Error('Koreksi hadir wajib memiliki jam masuk dan keluar.');
  if(['CUTI','IZIN','SAKIT','TIDAK_HADIR'].includes(data.status)&&(data.masuk||data.keluar)) throw Error('Status tidak bekerja tidak boleh memiliki jam masuk/keluar.');
  const shift=await prisma.shiftInstance.findUniqueOrThrow({where:{id:req.params.id}});
  if(await prisma.attendanceArchive.findFirst({where:{month:shift.date.slice(0,7),status:'FINAL'}})) throw Error('Periode sudah final. Buka kembali arsip terlebih dahulu.');
  if(data.masuk&&Math.abs(Date.parse(data.masuk)-+shift.start_at)>86400000) throw Error('Jam koreksi tidak sesuai tanggal shift.');
  await audit(prisma,req.user!.id,shift.id,'ATTENDANCE_CORRECTION',data.reason,{status:data.status,masuk:data.masuk,keluar:data.keluar});
  res.json({success:true});
}));
router.get('/archives',safe(async(_req,res)=>{res.json({data:await prisma.attendanceArchive.findMany({orderBy:[{month:'desc'},{revision:'desc'}],select:{id:true,month:true,revision:true,status:true,reason:true,created_at:true}})});}));
router.get('/archives/:id',safe(async(req,res)=>{res.json({data:await prisma.attendanceArchive.findUniqueOrThrow({where:{id:req.params.id}})});}));
router.post('/archives',safe(async(req,res)=>{
  const {month,reason}=z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),reason:z.string().min(5)}).parse(req.body);
  if(month>=localDate().slice(0,7)) throw Error('Finalisasi hanya untuk bulan yang sudah selesai.');
  const from=month+'-01',to=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
  const rows=await attendanceRows(from,to);
  const result=await serial(async tx=>{
    const last=await tx.attendanceArchive.findFirst({where:{month},orderBy:{revision:'desc'}});
    if(last?.status==='FINAL') throw Error('Buka kembali arsip sebelumnya sebelum membuat revisi.');
    const a=await tx.attendanceArchive.create({data:{month,revision:(last?.revision??0)+1,rows:JSON.parse(JSON.stringify(rows)),actor_id:req.user!.id,reason}});
    await audit(tx,req.user!.id,a.id,'ARCHIVE_FINAL',reason);return a;
  });res.json({data:result});
}));
router.post('/archives/:id/reopen',safe(async(req,res)=>{
  const {reason}=z.object({reason:z.string().min(5)}).parse(req.body);
  await serial(async tx=>{await tx.attendanceArchive.update({where:{id:req.params.id},data:{status:'REOPENED'}});await audit(tx,req.user!.id,req.params.id,'ARCHIVE_REOPEN',reason);});res.json({success:true});
}));
router.get('/leave-summary',safe(async(req,res)=>{
  const year=z.coerce.number().int().min(2020).max(2100).parse(req.query.year||new Date().getFullYear());
  const people=await prisma.staff.findMany({where:{role:{not:'ADMIN'}},select:{id:true,nama:true,nik:true,divisi:true},orderBy:{nama:'asc'}});
  const ledger=await prisma.leaveLedger.findMany({where:{year},orderBy:{created_at:'desc'}});
  const requests=await prisma.izinCuti.findMany({where:{tanggal_mulai:{lte:new Date(`${year}-12-31`)},tanggal_selesai:{gte:new Date(`${year}-01-01`)}},include:{staff:{select:{nama:true,nik:true,divisi:true,area_tugas_id:true}}},orderBy:{created_at:'desc'}});
  res.json({data:{people:people.map(p=>{const entries=ledger.filter(e=>e.staff_id===p.id);return {...p,legacy_approved_count:requests.filter(l=>l.staff_id===p.id&&l.status==='APPROVED'&&l.jenis==='CUTI'&&!Array.isArray(l.work_dates)).length,balance:entries.reduce((n,e)=>n+e.days,0),used:-entries.filter(e=>['USE','REFUND'].includes(e.kind)).reduce((n,e)=>n+e.days,0),pending:requests.filter(l=>l.staff_id===p.id&&l.status==='PENDING').length,entries};}),requests}});
}));
router.post('/leave-balance',safe(async(req,res)=>{
  const data=z.object({staff_id:z.string(),year:z.number().int().min(2020).max(2100),days:z.number().int().min(-366).max(366),reason:z.string().min(5).max(500)}).parse(req.body);
  await prisma.staff.findUniqueOrThrow({where:{id:data.staff_id}});
  const entry=await serial(async tx=>{const e=await tx.leaveLedger.create({data:{...data,kind:'ADJUSTMENT',actor_id:req.user!.id}});await audit(tx,req.user!.id,data.staff_id,'LEAVE_BALANCE',data.reason,data);return e;});res.json({data:entry});
}));
router.get('/leave/:id/impact',safe(async(req,res)=>{
  const l=await prisma.izinCuti.findUniqueOrThrow({where:{id:req.params.id},include:{staff:true}});
  const dates=(Array.isArray(l.work_dates)?l.work_dates:(await ensureShifts(l.staff_id,l.tanggal_mulai.toISOString().slice(0,10),l.tanggal_selesai.toISOString().slice(0,10))).map(s=>s.date)) as string[];
  const others=await prisma.izinCuti.findMany({where:{id:{not:l.id},status:'APPROVED',staff:{area_tugas_id:l.staff.area_tugas_id},tanggal_mulai:{lte:l.tanggal_selesai},tanggal_selesai:{gte:l.tanggal_mulai}},select:{id:true,staff:{select:{nama:true}},tanggal_mulai:true,tanggal_selesai:true}});
  const balances=[];
  for(const year of [...new Set(dates.map(d=>Number(d.slice(0,4))))]) {
    const balance=(await prisma.leaveLedger.aggregate({where:{staff_id:l.staff_id,year},_sum:{days:true}}))._sum.days??0;
    const days=dates.filter(d=>Number(d.slice(0,4))===year).length;
    balances.push({year,balance,days,after:l.jenis==='CUTI'&&l.status==='PENDING'?balance-days:balance});
  }
  res.json({data:{dates,balances,calendar_days:daysBetween(l.tanggal_mulai.toISOString().slice(0,10),l.tanggal_selesai.toISOString().slice(0,10)).length,others}});
}));
router.post('/leave/:id/cancel',safe(async(req,res)=>{
  const {reason}=z.object({reason:z.string().min(5).max(500)}).parse(req.body);
  await serial(async tx=>{
    const l=await tx.izinCuti.findUniqueOrThrow({where:{id:req.params.id}});
    if(!['PENDING','APPROVED'].includes(l.status)) throw Error('Pengajuan sudah selesai/dibatalkan.');
    const uses=await tx.leaveLedger.findMany({where:{leave_id:l.id,kind:'USE'}});
    for(const e of uses) await tx.leaveLedger.create({data:{staff_id:l.staff_id,year:e.year,days:-e.days,kind:'REFUND',leave_id:l.id,reason,actor_id:req.user!.id}});
    await tx.izinCuti.update({where:{id:l.id},data:{status:'CANCELLED',komentar_admin:reason,reviewed_by:req.user!.id,reviewed_at:new Date()}});
    await audit(tx,req.user!.id,l.id,'LEAVE_CANCEL',reason);
  });res.json({success:true});
}));
export default router;
