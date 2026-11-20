// Temporary local records only. Push, settings lookup, watermark and uploads are isolated stubs.
require('dotenv').config();const assert=require('node:assert/strict');const express=require('express');const jwt=require('jsonwebtoken');const {prisma:db}=require('../dist/lib/prisma');
const {localDate}=require('../dist/services/workforce.service');
const storage=require('../dist/services/storage.service');storage.uploadFile=async(_,key)=>storage.getFileUrl(key);
require('../dist/services/watermark.service').addWatermark=async buffer=>buffer;
const roles=['SATPAM','CS','UTILITY'],divisions=['KEAMANAN','CLEANING_SERVICE','UTILITY'];const users=[];let server;
const now=new Date();const hour=Math.floor(+now/3600000)*3600000;const early=now.getUTCMinutes()<2;
const checkpoints=early?[new Date(hour-120000),new Date(hour-60000)]:[new Date(hour),new Date(hour+60000)];const future=new Date(+now+10*60000);future.setUTCSeconds(0,0);
const clocks=[...checkpoints,future].map(d=>new Date(+d+7*3600000).toISOString().slice(11,16));
const originalSetting=db.reportScheduleSetting.findUnique.bind(db.reportScheduleSetting);db.reportScheduleSetting.findUnique=async({where})=>({role:where.role,enabled:true,times:clocks});
const {authenticate}=require('../dist/middleware/auth.middleware');const app=express();app.use(express.json());app.use('/laporan',require('../dist/routes/laporan.routes').default);
const prefix='FLEX-CHECK-'+Date.now();
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 for(let i=0;i<roles.length;i++){
  const u=await db.staff.create({data:{nik:prefix+i,nama:prefix,password_hash:'test-only',role:roles[i],divisi:divisions[i]}});users.push(u);
  const shift=await db.shiftInstance.create({data:{staff_id:u.id,date:localDate(new Date(+now-3600000)),start_at:new Date(+now-3600000),end_at:new Date(+now+3600000),tolerance:15,source:'TEST'}});
  await db.scheduleVersion.create({data:{staff_id:u.id,effective_date:'1900-01-01',schedule:[],actor_id:prefix}});
  const token=jwt.sign({id:u.id,role:u.role,divisi:u.divisi,jti:prefix},process.env.JWT_SECRET,{expiresIn:'10m'});
  const get=()=>fetch(base+'/laporan/perjam/jadwal',{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());
  const submit=async at=>{const f=new FormData();f.append('checkpoint',at.toISOString());f.append('jam',String(new Date(+at+7*3600000).getUTCHours()));f.append('status_keamanan','AMAN');f.append('catatan','Temporary integration check');f.append('lat','-6.2');f.append('lng','106.8');f.append('foto',new Blob([Buffer.from('test-photo')],{type:'image/jpeg'}),'test.jpg');const r=await fetch(base+'/laporan/perjam',{method:'POST',headers:{Authorization:'Bearer '+token},body:f});return {status:r.status,...await r.json()};};
  assert.equal((await get()).data.active,false);assert.equal((await submit(checkpoints[0])).status,400);
  await db.absensi.create({data:{staff_id:u.id,shift_id:shift.id,jenis:'MASUK',waktu_server:new Date(+now-1800000)}});
  assert.equal((await get()).data.active,true);
  assert.equal((await submit(future)).status,400);
  for(const at of checkpoints){const response=await submit(at);assert.equal(response.status,201,JSON.stringify(response));assert.equal(response.data.menit,at.getUTCMinutes());}
  assert.equal((await submit(checkpoints[0])).status,400);
  const rows=await db.laporanPerJam.findMany({where:{staff_id:u.id}});assert.equal(rows.length,2);assert.equal(rows[0].jam,rows[1].jam);assert.notEqual(rows[0].menit,rows[1].menit);
  await db.absensi.create({data:{staff_id:u.id,shift_id:shift.id,jenis:'KELUAR'}});assert.equal((await get()).data.active,false);
 }
 console.log('PASS: Satpam, CS, Utility schedule API and multipart submission; attendance requirement; future checkpoint rejection; same-hour minute slots; duplicate prevention; checkout.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 const ids=users.map(u=>u.id);if(ids.length){await db.laporanPerJam.deleteMany({where:{staff_id:{in:ids}}});await db.absensi.deleteMany({where:{staff_id:{in:ids}}});await db.shiftInstance.deleteMany({where:{staff_id:{in:ids}}});await db.scheduleVersion.deleteMany({where:{staff_id:{in:ids}}});await db.staff.deleteMany({where:{id:{in:ids}}});}if(server)server.close();await db.$disconnect();
});
