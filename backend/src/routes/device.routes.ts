import { Router, RequestHandler } from 'express';
import { createPublicKey, createHash, randomBytes, verify } from 'crypto';
import { z } from 'zod';
import { getDistance } from 'geolib';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { audit, serial, currentShift } from '../services/workforce.service';

const router=Router(); router.use(authenticate);
export const safe=(fn:RequestHandler):RequestHandler=>async(req,res,next)=>{try{await fn(req,res,next);}catch(e:any){res.status(e?.code==='P2034'?409:400).json({success:false,message:e?.code==='P2034'?'Data berubah. Muat ulang lalu coba lagi.':e.message||'Permintaan tidak dapat diproses.'});}};
router.get('/mine',safe(async(req,res)=>{res.json({data:await prisma.registeredDevice.findMany({where:{staff_id:req.user!.id},orderBy:{created_at:'desc'},select:{id:true,label:true,status:true,reason:true,created_at:true,last_used_at:true,public_key:true}})});}));
router.post('/register',safe(async(req,res)=>{
  const data=z.object({public_key:z.string().max(2000),label:z.string().min(2).max(100),reason:z.string().min(5).max(500)}).parse(req.body);
  const key=createPublicKey({key:Buffer.from(data.public_key,'base64'),format:'der',type:'spki'});
  if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048) throw Error('Kunci perangkat tidak valid.');
  const result=await serial(async tx=>{
    const existing=await tx.registeredDevice.findUnique({where:{public_key:data.public_key}});
    if(existing) {
      if(existing.staff_id!==req.user!.id) throw Error('Perangkat sudah terikat pada akun lain.');
      if(['REVOKED','REJECTED'].includes(existing.status)) {
        const renewed=await tx.registeredDevice.update({where:{id:existing.id},data:{status:'PENDING',reason:data.reason}});
        await audit(tx,req.user!.id,existing.id,'DEVICE_REQUEST',data.reason,{previous_status:existing.status});return renewed;
      }
      return existing;
    }
    if(await tx.registeredDevice.count({where:{staff_id:req.user!.id,status:'PENDING'}})) throw Error('Masih ada permohonan perangkat yang menunggu keputusan admin.');
    const d=await tx.registeredDevice.create({data:{...data,staff_id:req.user!.id}});
    await audit(tx,req.user!.id,d.id,'DEVICE_REQUEST',data.reason,{label:data.label}); return d;
  });res.status(201).json({data:result});
}));
router.post('/challenge',safe(async(req,res)=>{
  const {device_id,action}=z.object({device_id:z.string(),action:z.enum(['MASUK','KELUAR','MULAI_ISTIRAHAT','SELESAI_ISTIRAHAT'])}).parse(req.body);
  const d=await prisma.registeredDevice.findFirst({where:{id:device_id,staff_id:req.user!.id,status:'APPROVED'}});
  if(!d){res.status(403).json({message:'Perangkat ini belum disetujui admin atau telah dicabut.',code:'DEVICE_NOT_APPROVED'});return;}
  const c=await prisma.deviceChallenge.create({data:{staff_id:req.user!.id,device_id,action,nonce:randomBytes(32).toString('hex'),expires_at:new Date(Date.now()+120000)}});
  res.json({data:{id:c.id,nonce:c.nonce,expires_at:c.expires_at}});
}));

export const requireDevice:RequestHandler=safe(async(req,res,next)=>{
  const proof=z.object({challenge_id:z.string(),signature:z.string().max(1000),payload:z.string().max(3000)}).parse(JSON.parse(String(req.headers['x-device-proof']||'{}')));
  const p=z.object({nonce:z.string(),action:z.string(),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy:z.number().positive().max(50),captured_at:z.number(),mock:z.literal(false),photo_hash:z.string()}).parse(JSON.parse(proof.payload));
  const action=({'/masuk':'MASUK','/keluar':'KELUAR','/mulai-istirahat':'MULAI_ISTIRAHAT','/selesai-istirahat':'SELESAI_ISTIRAHAT'} as Record<string,string>)[req.path];
  const c=await prisma.deviceChallenge.findUnique({where:{id:proof.challenge_id}});
  if(!c||c.used_at||+c.expires_at<Date.now()||c.staff_id!==req.user!.id||c.action!==action||p.action!==action||p.nonce!==c.nonce) throw Error('Bukti absensi kedaluwarsa atau sudah digunakan. Ambil foto ulang.');
  if(Math.abs(Date.now()-p.captured_at)>120000) throw Error('Lokasi/foto sudah kedaluwarsa. Ambil foto ulang.');
  if(Number(req.body.lat)!==p.lat||Number(req.body.lng)!==p.lng||p.photo_hash!==(req.file?createHash('sha256').update(req.file.buffer).digest('hex'):'')) throw Error('Bukti foto atau lokasi tidak cocok.');
  const d=await prisma.registeredDevice.findFirst({where:{id:c.device_id,staff_id:req.user!.id,status:'APPROVED'}});
  if(!d||!verify('RSA-SHA256',Buffer.from(proof.payload),createPublicKey({key:Buffer.from(d.public_key,'base64'),format:'der',type:'spki'}),Buffer.from(proof.signature,'base64'))) {
    await audit(prisma,req.user!.id,c.device_id,'DEVICE_DENIED','Perangkat atau tanda tangan tidak valid');
    res.status(403).json({message:'Perangkat absensi tidak valid. Hubungi admin.',code:'DEVICE_NOT_APPROVED'});return;
  }
  const shift=await currentShift(req.user!.id,action);
  if(!shift) throw Error('Tidak ada jadwal aktif pada waktu ini. Hubungi admin untuk memeriksa jadwal.');
  const staff=await prisma.staff.findUniqueOrThrow({where:{id:req.user!.id},include:{area_tugas:true}});
  const area=staff.area_tugas;
  if(!area?.aktif) throw Error('Area tugas belum aktif. Hubungi admin.');
  const distance=getDistance({latitude:p.lat,longitude:p.lng},{latitude:area.lat,longitude:area.lng});
  if(distance>area.radius_meter) throw Error(`Di luar radius ${area.nama}: jarak ${distance} meter, batas ${area.radius_meter} meter.`);
  if(await prisma.izinCuti.findFirst({where:{staff_id:req.user!.id,status:'APPROVED',tanggal_mulai:{lte:new Date(shift.date)},tanggal_selesai:{gte:new Date(shift.date)}}})) throw Error('Ada izin/cuti disetujui pada shift ini. Hubungi admin untuk koreksi sebelum absen.');
  const consumed=await prisma.deviceChallenge.updateMany({where:{id:c.id,used_at:null},data:{used_at:new Date()}});
  if(consumed.count!==1) throw Error('Bukti absensi sudah digunakan.');
  await prisma.registeredDevice.update({where:{id:d.id},data:{last_used_at:new Date()}});
  res.locals.attendance={shift_id:shift.id,device_id:d.id,evidence:{accuracy:p.accuracy,captured_at:p.captured_at,photo_hash:p.photo_hash,device:d.label,challenge_id:c.id}};
  res.locals.shift=shift;
  req.body.akurasi_gps=p.accuracy;
  next();
});
export default router;
