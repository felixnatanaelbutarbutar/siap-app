// Creates and removes only uniquely named test records. Storage is stubbed: no real photo is deleted.
require('dotenv').config();
const assert=require('node:assert/strict');const express=require('express');const jwt=require('jsonwebtoken');
const {prisma:db}=require('../dist/lib/prisma');const storage=require('../dist/services/storage.service');
const removed=[];let fail=false;storage.deleteFile=async key=>{if(fail)throw Error('Simulated storage outage');removed.push(key);};
const {authenticate}=require('../dist/middleware/auth.middleware');
const {requireRole}=require('../dist/middleware/role.middleware');
const router=express.Router();router.use(authenticate,requireRole('ADMIN'));router.use('/report-cleanup',require('../dist/routes/report-cleanup.routes').default);
router.get('/absensi',require('../dist/controllers/absensi.controller').getAdminAbsensi);
const app=express();app.use(express.json());app.use('/admin',router);
const prefix='CLEANUP-CHECK-'+Date.now();const users=[];let server;
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 for(const role of ['ADMIN','SATPAM'])users.push(await db.staff.create({data:{nik:prefix+role,nama:prefix,role,divisi:role==='ADMIN'?'MANAJEMEN':'KEAMANAN',password_hash:'test-no-login'}}));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const tokens=users.map(u=>jwt.sign({...u,jti:prefix},process.env.JWT_SECRET,{expiresIn:'5m'}));
 async function call(path,body,who=0){const r=await fetch(base+'/admin/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens[who]},body:JSON.stringify(body)});return {status:r.status,...await r.json()};}
 const create=(extra={})=>db.laporan.create({data:{staff_id:users[1].id,divisi:'KEAMANAN',kategori:'PATROLI',judul:prefix,deskripsi:'Test only',status:'APPROVED',created_at:new Date('2098-02-01T00:00:00+07:00'),...extra}});
 const utility=await create({divisi:'UTILITY'});
 const mismatch=await call('report-cleanup/preview',{kind:'HARIAN',id:utility.id,divisi:'KEAMANAN'});assert.equal(mismatch.data.count,0);
 const scope=await call('report-cleanup/preview',{kind:'HARIAN',id:utility.id,divisi:'UTILITY'});assert.equal(scope.data.count,1);
 assert.equal((await call('report-cleanup/preview',{kind:'PER_JAM',divisi:'UTILITY',from:'2098-02',to:'2098-02'})).status,200);
 const shared=storage.getFileUrl('laporan/'+prefix+'/shared.jpg');
 const one=await create({foto_urls:[shared]});const two=await create({foto_urls:[shared]});
 assert.equal((await call('report-cleanup/preview',{kind:'HARIAN',id:one.id},1)).status,403);
 const preview=async id=>{const r=await call('report-cleanup/preview',{kind:'HARIAN',id});assert.equal(r.status,200,JSON.stringify(r));return r.data;};
 const confirm=p=>call('report-cleanup/confirm',{token:p.token,confirmation:'HAPUS',reason:'Temporary test cleanup'});
 let p=await preview(one.id);await db.laporan.update({where:{id:one.id},data:{judul:'Changed test record'}});assert.equal((await confirm(p)).status,400);
 p=await preview(one.id);assert.equal((await confirm(p)).data.retainedPhotos,1);assert.equal(removed.length,0);assert.equal((await confirm(p)).status,400);
 p=await preview(two.id);fail=true;let r=await confirm(p);assert.equal(r.data.pendingPhotos,1);assert.equal(await db.laporan.count({where:{id:two.id}}),0);
 fail=false;r=await call('report-cleanup/jobs/'+r.data.id+'/retry',{});assert.equal(r.data.pendingPhotos,0);assert.equal(removed.length,1);
 const draft=await create({status:'DRAFT'});const edge=await create({created_at:new Date('2098-01-31T16:59:59Z')});const inside=await create();
 const period=await call('report-cleanup/preview',{kind:'HARIAN',divisi:'KEAMANAN',from:'2098-02',to:'2098-02'});assert.ok(!period.data.sample.some(x=>x.id===utility.id));assert.equal(period.status,200);assert.ok(period.data.sample.some(x=>x.id===inside.id));assert.ok(!period.data.sample.some(x=>[edge.id,draft.id].includes(x.id)));
 assert.equal((await call('report-cleanup/preview',{kind:'HARIAN',from:'2098-13',to:'2098-14'})).status,400);
 const patrol=await db.laporanPerJam.create({data:{staff_id:users[1].id,tanggal:new Date('2098-02-01'),jam:3}});
 const pp=await call('report-cleanup/preview',{kind:'PER_JAM',id:patrol.id});assert.equal((await confirm(pp.data)).data.count,1);
 await db.absensi.createMany({data:Array.from({length:204},(_,i)=>({staff_id:users[1].id,jenis:'MASUK',waktu_server:new Date(Date.parse('2098-02-01T00:00:00+07:00')+i*1000)}))});
 const attendance=await fetch(base+'/admin/absensi?tanggal=2098-02-01&staff_id='+users[1].id+'&divisi=KEAMANAN',{headers:{Authorization:'Bearer '+tokens[0]}}).then(r=>r.json());assert.equal(attendance.data.length,204);assert.equal(attendance.pagination.total,1);
 const other=await fetch(base+'/admin/absensi?tanggal=2098-02-01&staff_id='+users[1].id+'&divisi=UTILITY',{headers:{Authorization:'Bearer '+tokens[0]}}).then(r=>r.json());assert.equal(other.data.length,0);
 console.log('PASS: report division scope and scheduled report cleanup for all roles; attendance events not truncated, division isolation; admin authorization, stale/replayed preview, WIB boundary, pending exclusion, shared photo protection, storage failure + retry, patrol deletion.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 const ids=users.map(u=>u.id);if(!ids.length){if(server)server.close();await db.$disconnect();return;}await db.laporan.deleteMany({where:{staff_id:{in:ids}}});await db.laporanPerJam.deleteMany({where:{staff_id:{in:ids}}});await db.workforceAudit.deleteMany({where:{actor_id:{in:ids}}});await db.absensi.deleteMany({where:{staff_id:{in:ids}}});await db.staff.deleteMany({where:{id:{in:ids}}});if(server)server.close();await db.$disconnect();
});
