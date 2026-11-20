// HTTP tests with isolated in-memory settings. Does not change real role configuration.
const assert=require('node:assert/strict');const express=require('express');const {prisma:db}=require('../dist/lib/prisma');const rows=new Map(),audits=[];
db.reportScheduleSetting.findMany=async()=>[...rows.values()];db.reportScheduleSetting.findUnique=async({where})=>rows.get(where.role)||null;db.reportScheduleSetting.findUniqueOrThrow=async({where})=>rows.get(where.role);
db.reportScheduleSetting.create=async({data})=>{const row={...data,version:1,updated_at:new Date()};rows.set(data.role,row);return row;};
db.reportScheduleSetting.updateMany=async({where,data})=>{const row=rows.get(where.role);if(!row||row.version!==where.version)return {count:0};rows.set(where.role,{...row,...data,version:row.version+1,updated_at:new Date()});return {count:1};};
db.workforceAudit.create=async({data})=>{audits.push(data);return data;};db.$transaction=async fn=>fn(db);
const {requireRole}=require('../dist/middleware/role.middleware');const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={id:'test-admin',role:req.headers['x-role']||'ADMIN'};next();});app.use('/settings',requireRole('ADMIN'),require('../dist/routes/report-settings.routes').default);let server;
async function main(){server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,body,role='ADMIN')=>{const r=await fetch(base+'/settings'+path,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json','x-role':role},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};};
 const initial=await req('');assert.equal(initial.data.roles.length,3);assert.ok(initial.data.roles.every(s=>s.enabled===false));assert.equal((await req('',null,'UTILITY')).status,403);
 for(const role of ['SATPAM','CS','UTILITY']){const r=await req('/'+role,{enabled:true,times:['15:00','09:30','09:00'],version:0});assert.equal(r.status,200);assert.deepEqual(r.data.times,['09:00','09:30','15:00']);assert.equal(r.data.version,1);}
 assert.equal((await req('/UTILITY',{enabled:true,times:['10:00'],version:0})).status,400);
 assert.equal((await req('/UTILITY',{enabled:true,times:['10:00','10:00'],version:1})).status,400);
 assert.equal((await req('/UTILITY',{enabled:true,times:[],version:1})).status,400);
 assert.equal((await req('/ADMIN',{enabled:true,times:['10:00'],version:0})).status,400);
 const disabled=await req('/UTILITY',{enabled:false,times:[],version:1});assert.equal(disabled.data.version,2);assert.equal(disabled.data.enabled,false);assert.equal(audits.length,4);
 console.log('PASS: admin-only settings API, default inactive roles, sorted minute schedules, optimistic concurrency, input validation, disable and audit.');}
 main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)server.close();await db.$disconnect();});
