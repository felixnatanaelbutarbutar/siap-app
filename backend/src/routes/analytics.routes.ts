import {Router} from 'express';
import {z} from 'zod';
import {prisma} from '../lib/prisma';
import {authenticate} from '../middleware/auth.middleware';
import {requireRole} from '../middleware/role.middleware';
import {safe} from './device.routes';
import {addDays,attendanceRows,localDate,daysBetween} from '../services/workforce.service';

const router=Router();router.use(authenticate,requireRole('ADMIN'));
router.get('/',safe(async(req,res)=>{
  const period=z.coerce.number().int().min(7).max(31).parse(req.query.days||14);
  const division=z.enum(['ALL','KEAMANAN','CLEANING_SERVICE','UTILITY']).parse(req.query.division||'ALL');
  const today=localDate(),from=addDays(today,1-period),now=Date.now();
  const allRows=await attendanceRows(from,today);
  const rows=allRows.filter(r=>r.source!=='UNSCHEDULED'&&(division==='ALL'||r.divisi===division));
  const activeStaff=await prisma.staff.findMany({where:{aktif:true,role:{not:'ADMIN'},...(division!=='ALL'?{divisi:division}:{})},select:{id:true}});
  const todayRows=rows.filter(r=>(r.date===today||(+new Date(r.start_at)<=now&&+new Date(r.end_at)>now))&&activeStaff.some(s=>s.id===r.staff_id));
  const isLeave=(r:any)=>['CUTI','SAKIT','IZIN'].includes(r.status);
  const attended=(r:any)=>!!r.masuk;
  const trend=daysBetween(from,today).map(date=>{
    const group=rows.filter(r=>r.date===date),due=group.filter(r=>(+new Date(r.start_at)<=now||!!r.masuk)&&!isLeave(r));
    const late=group.filter(r=>r.terlambat);
    return {date,label:date.slice(8)+'/'+date.slice(5,7),scheduled:group.length,due:due.length,attended:group.filter(attended).length,leave:group.filter(isLeave).length,absent:group.filter(r=>r.status==='TIDAK_HADIR').length,waiting:group.filter(r=>r.status==='BELUM_ABSEN').length,late:late.length,late_minutes:late.reduce((n,r)=>n+r.menit_terlambat,0),late_average:late.length?Math.round(late.reduce((n,r)=>n+r.menit_terlambat,0)/late.length):0};
  });
  const coverage=['KEAMANAN','CLEANING_SERVICE','UTILITY'].filter(d=>division==='ALL'||division===d).map(divisi=>{
    const list=todayRows.filter(r=>r.divisi===divisi),due=list.filter(r=>(+new Date(r.start_at)<=now||!!r.masuk)&&!isLeave(r));
    return {name:divisi==='CLEANING_SERVICE'?'Cleaning Service':divisi==='KEAMANAN'?'Keamanan':'Utility',scheduled:list.length,due:due.length,attended:due.filter(attended).length,waiting:due.filter(r=>!r.masuk).length,leave:list.filter(isLeave).length};
  });
  const leaveRequests=await prisma.izinCuti.findMany({where:{created_at:{gte:new Date(from+'T00:00:00+07:00')},...(division!=='ALL'?{staff:{divisi:division}}:{})},select:{jenis:true,status:true}});
  const staffFilter=division!=='ALL'?{staff:{divisi:division}}:{};
  const [pendingLeave,pendingReports,deviceRequests,offlineReceipts,offlineReviews]=await Promise.all([
    prisma.izinCuti.count({where:{status:'PENDING',...staffFilter}}),
    prisma.laporan.count({where:{status:'SUBMITTED',...(division!=='ALL'?{divisi:division}:{})}}),
    prisma.registeredDevice.findMany({where:{status:'PENDING'},select:{staff_id:true}}),
    prisma.workforceAudit.findMany({where:{action:'OFFLINE_PENDING'},select:{id:true,actor_id:true}}),
    prisma.workforceAudit.findMany({where:{action:{in:['OFFLINE_APPROVED','OFFLINE_REJECTED']}},select:{subject_id:true}})
  ]);
  const dueToday=todayRows.filter(r=>(+new Date(r.start_at)<=now||!!r.masuk)&&!isLeave(r));
  const present=dueToday.filter(attended).length;
  const counts={scheduled:todayRows.length,due:dueToday.length,present,rate:dueToday.length?Math.round(present/dueToday.length*100):null,waiting:todayRows.filter(r=>r.status==='BELUM_ABSEN').length,absent:todayRows.filter(r=>r.status==='TIDAK_HADIR').length,late:todayRows.filter(r=>r.terlambat).length,leave:todayRows.filter(isLeave).length,upcoming:todayRows.filter(r=>r.status==='BELUM_WAKTUNYA').length};
  const exceptions=rows.filter(r=>['BELUM_ABSEN','TIDAK_HADIR','TIDAK_LENGKAP'].includes(r.status)||r.terlambat).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(r=>({id:r.id,nama:r.nama,nik:r.nik,date:r.date,status:r.status,terlambat:r.terlambat,menit:r.menit_terlambat,area:r.area_nama,division:r.divisi,start:r.start_at}));
  res.json({data:{today,from,timezone:'Asia/Jakarta',generated_at:new Date().toISOString(),counts,trend,coverage,exceptions,leave_types:['CUTI','SAKIT','IZIN'].map(name=>({name,value:leaveRequests.filter(l=>l.jenis===name).length})),leave_status:['PENDING','APPROVED','REJECTED','CANCELLED'].map(name=>({name,value:leaveRequests.filter(l=>l.status===name).length})),pending:{leave:pendingLeave,reports:pendingReports,devices:deviceRequests.filter(d=>activeStaff.some(s=>s.id===d.staff_id)).length,offline:offlineReceipts.filter(r=>activeStaff.some(s=>s.id===r.actor_id)&&!offlineReviews.some(v=>v.subject_id===r.id)).length},legacy_baseline:rows.filter(r=>r.source==='LEGACY_BASELINE').length}});
}));
export default router;
