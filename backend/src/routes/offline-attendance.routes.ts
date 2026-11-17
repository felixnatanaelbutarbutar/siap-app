import {Router} from 'express';
import {createHash,createPublicKey,verify} from 'crypto';
import {z} from 'zod';
import {authenticate} from '../middleware/auth.middleware';
import {requireRole} from '../middleware/role.middleware';
import {uploadImage} from '../middleware/upload.middleware';
import {uploadFile} from '../services/storage.service';
import {prisma} from '../lib/prisma';
import {safe} from './device.routes';
import {audit,ensureShifts,localDate,serial} from '../services/workforce.service';

const router=Router();router.use(authenticate);
router.post('/',uploadImage.single('foto'),safe(async(req,res)=>{
  const proof=z.object({device_id:z.string(),payload:z.string().max(3000),signature:z.string().max(1000)}).parse(JSON.parse(String(req.headers['x-device-proof']||'{}')));
  const p=z.object({id:z.string().regex(/^offline-[a-zA-Z0-9-]+$/).max(100),staff_id:z.string(),action:z.enum(['MASUK','KELUAR','MULAI_ISTIRAHAT','SELESAI_ISTIRAHAT']),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy:z.number().positive().max(50),captured_at:z.number(),mock:z.literal(false),photo_hash:z.string()}).parse(JSON.parse(proof.payload));
  if(p.staff_id!==req.user!.id) throw Error('Pemilik bukti offline tidak cocok.');
  if(p.captured_at>Date.now()+60000||p.captured_at<Date.now()-7*86400000) throw Error('Bukti offline harus dikirim dalam tujuh hari. Hubungi admin untuk koreksi manual.');
  const device=await prisma.registeredDevice.findFirst({where:{id:proof.device_id,staff_id:p.staff_id,status:'APPROVED'}});
  if(!device||!verify('RSA-SHA256',Buffer.from(proof.payload),createPublicKey({key:Buffer.from(device.public_key,'base64'),format:'der',type:'spki'}),Buffer.from(proof.signature,'base64'))) throw Error('Perangkat offline tidak valid atau telah dicabut.');
  if(['MASUK','KELUAR'].includes(p.action)&&!req.file) throw Error('Foto wajib disertakan.');
  if(p.photo_hash!==(req.file?createHash('sha256').update(req.file.buffer).digest('hex'):'')) throw Error('Foto offline tidak cocok dengan tanda tangan.');
  if(await prisma.workforceAudit.findUnique({where:{id:p.id}})){res.json({success:true});return;}
  const photo=req.file?await uploadFile(req.file.buffer,`offline/${p.id}.jpg`,'image/jpeg'):null;
  await prisma.workforceAudit.create({data:{id:p.id,actor_id:p.staff_id,subject_id:p.id,action:'OFFLINE_PENDING',reason:'Waktu perangkat belum diverifikasi; menunggu admin',detail:{...p,device_id:device.id,device:device.label,photo}}});
  res.status(201).json({success:true,message:'Bukti diterima, menunggu verifikasi admin.'});
}));
router.get('/mine',safe(async(req,res)=>{
  const rows=await prisma.workforceAudit.findMany({where:{actor_id:req.user!.id,action:'OFFLINE_PENDING'},orderBy:{created_at:'desc'},take:30});
  const reviews=await prisma.workforceAudit.findMany({where:{subject_id:{in:rows.map(r=>r.id)},action:{in:['OFFLINE_APPROVED','OFFLINE_REJECTED']}}});
  res.json({data:rows.map(r=>({...r,status:reviews.find(v=>v.subject_id===r.id)?.action||'OFFLINE_PENDING'}))});
}));
router.get('/',requireRole('ADMIN'),safe(async(_req,res)=>{
  const rows=await prisma.workforceAudit.findMany({where:{action:'OFFLINE_PENDING'},orderBy:{created_at:'desc'},take:500});
  const reviews=await prisma.workforceAudit.findMany({where:{subject_id:{in:rows.map(r=>r.id)},action:{in:['OFFLINE_APPROVED','OFFLINE_REJECTED']}}});
  const people=await prisma.staff.findMany({select:{id:true,nama:true,nik:true}});
  res.json({data:rows.map(r=>({...r,staff:people.find(p=>p.id===r.actor_id),review:reviews.find(v=>v.subject_id===r.id)}))});
}));
router.post('/:id/review',requireRole('ADMIN'),safe(async(req,res)=>{
  const {status,reason,date}=z.object({status:z.enum(['APPROVED','REJECTED']),reason:z.string().min(10),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).parse(req.body);
  const row=await prisma.workforceAudit.findUniqueOrThrow({where:{id:req.params.id}});
  if(row.action!=='OFFLINE_PENDING') throw Error('Bukan bukti offline.');
  const p=row.detail as any;
  const shiftDate=date||localDate(new Date(p.captured_at));
  const shifts=status==='APPROVED'?await ensureShifts(row.actor_id,shiftDate,shiftDate):[];
  if(status==='APPROVED'&&!shifts.length) throw Error('Tidak ada jadwal pada tanggal shift.');
  await serial(async tx=>{
    if(await tx.workforceAudit.findFirst({where:{subject_id:row.id,action:{in:['OFFLINE_APPROVED','OFFLINE_REJECTED']}}})) throw Error('Bukti sudah diproses.');
    if(status==='APPROVED') {
      const shift=shifts[0];
      if(Math.abs(p.captured_at-+shift.start_at)>26*3600000) throw Error('Tanggal bukti tidak cocok dengan shift.');
      if(await tx.attendanceArchive.findFirst({where:{month:shiftDate.slice(0,7),status:'FINAL'}})) throw Error('Buka kembali arsip periode ini terlebih dahulu.');
      if(await tx.izinCuti.findFirst({where:{staff_id:row.actor_id,status:'APPROVED',tanggal_mulai:{lte:new Date(shiftDate)},tanggal_selesai:{gte:new Date(shiftDate)}}})) throw Error('Ada cuti/izin disetujui. Koreksi cuti dahulu.');
      await tx.absensi.create({data:{staff_id:row.actor_id,shift_id:shift.id,device_id:p.device_id,jenis:p.action,foto_url:p.photo,lat:p.lat,lng:p.lng,akurasi_gps:p.accuracy,waktu_server:new Date(p.captured_at),catatan:'Offline diverifikasi admin: '+reason,evidence:{offline:true,device:p.device,received_at:row.created_at.toISOString(),approved_by:req.user!.id,approved_at:new Date().toISOString()}}});
    }
    await audit(tx,req.user!.id,row.id,'OFFLINE_'+status,reason,{shift_date:shiftDate});
  });res.json({success:true});
}));
export default router;
