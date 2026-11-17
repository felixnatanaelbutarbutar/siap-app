// Integration checks use uniquely named temporary staff; never submit attendance for an existing employee.
require('dotenv').config();
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const jwt=require('jsonwebtoken');
const sharp=require('sharp');
const {classifyShift,localDate,addDays}=require('../dist/services/workforce.service');
const {deleteFile}=require('../dist/services/storage.service');
const db=new PrismaClient();const base='http://127.0.0.1:3000';
const prefix='WF-CHECK-'+Date.now();let employee,admin,area;const files=[];const subjects=[];
const token=(u)=>jwt.sign({id:u.id,nik:u.nik,nama:u.nama,role:u.role,divisi:u.divisi,jti:crypto.randomUUID()},process.env.JWT_SECRET,{expiresIn:'10m'});
async function request(path,auth,body,method='POST',extra={}){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+auth,...(!(body instanceof FormData)&&body?{'Content-Type':'application/json'}:{}),...extra},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});const data=await r.json();return {status:r.status,...data};}
function expect(r,status){assert.equal(r.status,status,JSON.stringify(r));return r;}
async function main(){
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname),'Local database only');
  area=await db.areaTugas.create({data:{nama:prefix,lat:-6.2,lng:106.8,radius_meter:200}});
  employee=await db.staff.create({data:{nik:prefix,nama:prefix,password_hash:'not-a-login-password',role:'SATPAM',divisi:'KEAMANAN',area_tugas_id:area.id}});
  admin=await db.staff.create({data:{nik:prefix+'-ADMIN',nama:prefix+' Admin',password_hash:'not-a-login-password',role:'ADMIN',divisi:'MANAJEMEN'}});
  const et=token(employee),at=token(admin);const today=localDate();
  await db.scheduleVersion.create({data:{staff_id:employee.id,effective_date:'1900-01-01',schedule:[],actor_id:admin.id}});
  const shift=await db.shiftInstance.create({data:{staff_id:employee.id,date:today,start_at:new Date(Date.now()-3600000),end_at:new Date(Date.now()+3600000),tolerance:15,area:{nama:prefix}}});
  const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const public_key=pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
  let r=expect(await request('/devices/register',et,{public_key,label:'Integration test device',reason:'Temporary integration check'}),201);const device=r.data;subjects.push(device.id);
  expect(await request('/devices/challenge',et,{device_id:device.id,action:'MASUK'}),403);
  expect(await request(`/admin/workforce/devices/${device.id}/review`,et,{status:'APPROVED',reason:'Unauthorized test'}),403);
  expect(await request(`/admin/workforce/devices/${device.id}/review`,at,{status:'APPROVED',reason:'Verified test employee'}),200);
  const photo=await sharp({create:{width:120,height:120,channels:3,background:'green'}}).jpeg().toBuffer();
  async function proof(action,overrides={}){
    const challenge=expect(await request('/devices/challenge',et,{device_id:device.id,action}),200).data;
    const payload=JSON.stringify({nonce:challenge.nonce,action,lat:-6.2,lng:106.8,accuracy:10,captured_at:Date.now(),mock:false,photo_hash:crypto.createHash('sha256').update(photo).digest('hex'),...overrides});
    return JSON.stringify({challenge_id:challenge.id,payload,signature:crypto.sign('RSA-SHA256',Buffer.from(payload),pair.privateKey).toString('base64')});
  }
  const form=()=>{const f=new FormData();f.append('lat','-6.2');f.append('lng','106.8');f.append('foto',new Blob([photo],{type:'image/jpeg'}),'check.jpg');return f;};
  expect(await request('/absensi/masuk',et,form()),400);
  expect(await request('/absensi/masuk',et,form(),'POST',{'X-Device-Proof':await proof('MASUK',{mock:true})}),400);
  expect(await request('/absensi/masuk',et,form(),'POST',{'X-Device-Proof':await proof('MASUK',{lat:0})}),400);
  const valid=await proof('MASUK');r=expect(await request('/absensi/masuk',et,form(),'POST',{'X-Device-Proof':valid}),200);files.push(r.data.foto_url);assert.equal(r.data.shift_id,shift.id);assert.equal(r.data.device_id,device.id);
  expect(await request('/absensi/masuk',et,form(),'POST',{'X-Device-Proof':valid}),400);
  r=expect(await request('/absensi/keluar',et,form(),'POST',{'X-Device-Proof':await proof('KELUAR')}),200);files.push(r.data.foto_url);
  const entries=await db.absensi.findMany({where:{staff_id:employee.id}});assert.equal(entries.length,2);
  expect(await request('/admin/analytics?days=7',et,null,'GET'),403);
  const analytics=expect(await request('/admin/analytics?days=7',at,null,'GET'),200).data;
  assert.equal(analytics.trend.length,7);
  assert.ok(analytics.counts.present<=analytics.counts.due);
  assert.equal(analytics.counts.rate,analytics.counts.due?Math.round(100*analytics.counts.present/analytics.counts.due):null);
  const report=expect(await request(`/admin/workforce/attendance?from=${today}&to=${today}`,at,null,'GET'),200).data.find(r=>r.staff_id===employee.id);assert.equal(report.status,'HADIR');assert.equal(report.terlambat,true);
  expect(await request(`/admin/workforce/attendance/${shift.id}/correct`,at,{status:'HADIR',masuk:new Date(+shift.start_at-60000).toISOString(),keluar:new Date(+shift.end_at).toISOString(),reason:'Verified correction for test only'}),200);
  subjects.push(shift.id);
  const corrected=expect(await request(`/admin/workforce/attendance?from=${today}&to=${today}`,at,null,'GET'),200).data.find(r=>r.staff_id===employee.id);
  assert.equal(corrected.terlambat,false);assert.equal(corrected.original.terlambat,true);
  const offId='offline-test-'+Date.now();subjects.push(offId);
  const offPayload=JSON.stringify({id:offId,staff_id:employee.id,action:'MASUK',lat:-6.2,lng:106.8,accuracy:10,captured_at:Date.now(),mock:false,photo_hash:crypto.createHash('sha256').update(photo).digest('hex')});
  const offProof=JSON.stringify({device_id:device.id,payload:offPayload,signature:crypto.sign('RSA-SHA256',Buffer.from(offPayload),pair.privateKey).toString('base64')});
  expect(await request('/offline-attendance',et,form(),'POST',{'X-Device-Proof':offProof}),201);
  expect(await request('/offline-attendance',et,form(),'POST',{'X-Device-Proof':offProof}),200);
  const receipt=await db.workforceAudit.findUnique({where:{id:offId}});files.push(receipt.detail.photo);
  assert.equal(await db.absensi.count({where:{staff_id:employee.id}}),2,'Offline receipt must not auto-count as attendance');
  expect(await request(`/offline-attendance/${offId}/review`,at,{status:'REJECTED',reason:'Duplicate attendance already verified'}),200);
  expect(await request(`/offline-attendance/${offId}/review`,at,{status:'REJECTED',reason:'Second review must fail'}),400);
  expect(await request(`/admin/workforce/devices/${device.id}/review`,at,{status:'REVOKED',reason:'Test revocation check'}),200);
  expect(await request('/devices/challenge',et,{device_id:device.id,action:'MASUK'}),403);
  const tomorrow=addDays(today,1);await db.shiftInstance.create({data:{staff_id:employee.id,date:tomorrow,start_at:new Date(tomorrow+'T08:00:00+07:00'),end_at:new Date(tomorrow+'T16:00:00+07:00'),tolerance:15}});
  const leave=await db.izinCuti.create({data:{staff_id:employee.id,jenis:'CUTI',tanggal_mulai:new Date(tomorrow),tanggal_selesai:new Date(tomorrow),keterangan:'Temporary test'}});subjects.push(leave.id);
  expect(await request(`/admin/izin/${leave.id}`,at,{status:'APPROVED',komentar_admin:'Insufficient balance test'},'PUT'),400);
  expect(await request('/admin/workforce/leave-balance',at,{staff_id:employee.id,year:Number(tomorrow.slice(0,4)),days:12,reason:'Temporary entitlement'}),200);
  expect(await request(`/admin/izin/${leave.id}`,at,{status:'APPROVED',komentar_admin:'Verified test leave'},'PUT'),200);
  expect(await request(`/admin/izin/${leave.id}`,at,{status:'APPROVED'},'PUT'),400);
  assert.equal((await db.leaveLedger.aggregate({where:{staff_id:employee.id},_sum:{days:true}}))._sum.days,11);
  expect(await request(`/admin/workforce/leave/${leave.id}/cancel`,at,{reason:'Test cancellation refund'}),200);
  expect(await request(`/admin/workforce/leave/${leave.id}/cancel`,at,{reason:'Double refund must fail'}),400);
  assert.equal((await db.leaveLedger.aggregate({where:{staff_id:employee.id},_sum:{days:true}}))._sum.days,12);
  const overnight={start_at:'2026-11-16T15:00:00Z',end_at:'2026-11-16T23:00:00Z',tolerance:15};
  assert.equal(classifyShift(overnight,[],null,new Date('2026-11-16T16:00:00Z')).status,'BELUM_ABSEN');
  assert.equal(classifyShift(overnight,[],null,new Date('2026-11-17T02:00:00Z')).status,'TIDAK_HADIR');
  assert.equal(classifyShift(overnight,[],{jenis:'CUTI'},new Date('2026-11-17T02:00:00Z')).status,'CUTI');
  console.log('PASS: offline receipt deduplication, manual review, immutable raw attendance correction, enrollment, admin authorization, signature binding, replay rejection, mock rejection, attendance upload, shift recap, revocation, leave balance, refund idempotency, overnight classification');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  for(const url of files) {try{await deleteFile(new URL(url).pathname.split('/').slice(2).join('/'));}catch(e){console.error('Test photo cleanup failed');}}
  if(employee){await db.absensi.deleteMany({where:{staff_id:employee.id}});await db.deviceChallenge.deleteMany({where:{staff_id:employee.id}});await db.registeredDevice.deleteMany({where:{staff_id:employee.id}});await db.leaveLedger.deleteMany({where:{staff_id:employee.id}});await db.izinCuti.deleteMany({where:{staff_id:employee.id}});await db.shiftInstance.deleteMany({where:{staff_id:employee.id}});await db.scheduleVersion.deleteMany({where:{staff_id:employee.id}});await db.workforceAudit.deleteMany({where:{OR:[{subject_id:{in:[employee.id,...subjects]}},{actor_id:{in:[employee.id,admin?.id].filter(Boolean)}}]}});await db.staff.delete({where:{id:employee.id}});}
  if(admin)await db.staff.delete({where:{id:admin.id}});if(area)await db.areaTugas.delete({where:{id:area.id}});await db.$disconnect();
});
