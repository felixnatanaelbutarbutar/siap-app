import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const ZONE = 'Asia/Jakarta';
export const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year:'numeric',month:'2-digit',day:'2-digit' }).format(d);
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0,10);
export const daysBetween = (from: string, to: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || from > to || Date.parse(to)-Date.parse(from)>366*86400000) throw new Error('Rentang tanggal tidak valid (maksimal 366 hari).');
  const days:string[]=[]; for(let d=from;d<=to;d=addDays(d,1)) days.push(d); return days;
};
const weekdays=['AHAD','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];
export const audit = (db:any, actor:string, subject:string, action:string, reason:string, detail:any={}) => db.workforceAudit.create({data:{actor_id:actor,subject_id:subject,action,reason,detail}});

// Before a schedule mutation, persist the old weekly schedule. New versions take effect tomorrow.
export async function saveScheduleVersion(db:any, staffId:string, actor:string, effective:string) {
  const rows=await db.jadwalKerja.findMany({where:{staff_id:staffId,aktif:true}});
  // Invalidate only future materializations without attendance; active/past shifts stay immutable.
  const future=await db.shiftInstance.findMany({where:{staff_id:staffId,date:{gte:effective}},select:{id:true}});
  const linked=await db.absensi.findMany({where:{shift_id:{in:future.map((s:any)=>s.id)}},select:{shift_id:true}});
  await db.shiftInstance.deleteMany({where:{id:{in:future.filter((s:any)=>!linked.some((e:any)=>e.shift_id===s.id)).map((s:any)=>s.id)}}});
  await db.scheduleVersion.upsert({where:{staff_id_effective_date:{staff_id:staffId,effective_date:effective}},update:{schedule:rows,actor_id:actor},create:{staff_id:staffId,effective_date:effective,schedule:rows,actor_id:actor}});
}
export async function seedScheduleHistory(db:any, staffId:string) {
  if(!await db.scheduleVersion.findFirst({where:{staff_id:staffId}})) await saveScheduleVersion(db,staffId,'migration','1900-01-01');
}

export async function ensureShifts(staffId:string, from:string, to:string) {
  const dates=daysBetween(from,to);
  const staff=await prisma.staff.findUniqueOrThrow({where:{id:staffId},include:{area_tugas:true}});
  await seedScheduleHistory(prisma,staffId);
  const versions=await prisma.scheduleVersion.findMany({where:{staff_id:staffId},orderBy:{effective_date:'desc'}});
  const settings=await prisma.pengaturanSistem.findUnique({where:{id:'singleton'}});
  await prisma.workforceAudit.upsert({where:{id:'attendance-policy-baseline'},update:{},create:{id:'attendance-policy-baseline',actor_id:'migration',subject_id:'attendance-policy',action:'POLICY_VERSION',reason:'Kebijakan awal saat pembaruan',detail:{effective_date:'1900-01-01',tolerance:settings?.toleransi_keterlambatan_menit??15}}});
  const policies=await prisma.workforceAudit.findMany({where:{subject_id:'attendance-policy',action:'POLICY_VERSION'},orderBy:{created_at:'desc'}});
  const existingDates=new Set((await prisma.shiftInstance.findMany({where:{staff_id:staffId,date:{gte:from,lte:to}},select:{date:true}})).map(s=>s.date));
  const firstEvent=await prisma.absensi.findFirst({where:{staff_id:staffId},orderBy:{waktu_server:'asc'},select:{waktu_server:true}});
  const employmentStart=firstEvent&&firstEvent.waktu_server<staff.created_at?localDate(firstEvent.waktu_server):localDate(staff.created_at);
  for(const date of dates) {
    if(existingDates.has(date)) continue;
    if(date<employmentStart) continue;
    const v=versions.find(v=>v.effective_date<=date);
    const weekly=(v?.schedule || []) as any[];
    const j=weekly.find(j=>j.hari===weekdays[new Date(date+'T12:00:00Z').getUTCDay()]);
    if(!j) continue;
    const start=new Date(`${date}T${j.jam_masuk}:00+07:00`);
    const end=new Date(`${j.jam_keluar<=j.jam_masuk ? addDays(date,1):date}T${j.jam_keluar}:00+07:00`);
    const policy=policies.map(p=>p.detail as any).find(p=>p.effective_date<=date);
    await prisma.shiftInstance.upsert({where:{staff_id_date:{staff_id:staffId,date}},update:{},create:{staff_id:staffId,date,start_at:start,end_at:end,tolerance:policy?.tolerance??15,area:staff.area_tugas as any,source:v?.effective_date==='1900-01-01'?'LEGACY_BASELINE':'SCHEDULE'}});
  }
  return prisma.shiftInstance.findMany({where:{staff_id:staffId,date:{gte:from,lte:to}},orderBy:{date:'asc'}});
}

export function classifyShift(shift:any, events:any[], leave:any, now=new Date()) {
  const masuk=events.find(e=>e.jenis==='MASUK'); const keluar=events.find(e=>e.jenis==='KELUAR');
  const late=masuk?Math.max(0,Math.ceil((+new Date(masuk.waktu_server)-+new Date(shift.start_at))/60000)):0;
  const early=keluar?Math.max(0,Math.floor((+new Date(shift.end_at)-+new Date(keluar.waktu_server))/60000)):0;
  const ended=+now>+new Date(shift.end_at)+2*3600000;
  const status=masuk ? (!keluar ? (ended?'TIDAK_LENGKAP':'SHIFT_AKTIF'):'HADIR') : leave ? leave.jenis : +now<+new Date(shift.start_at)?'BELUM_WAKTUNYA':ended?'TIDAK_HADIR':'BELUM_ABSEN';
  let breakStart:number|null=null,breakMs=0;
  for(const e of events) {
    if(e.jenis==='MULAI_ISTIRAHAT') breakStart=+new Date(e.waktu_server);
    if(e.jenis==='SELESAI_ISTIRAHAT'&&breakStart!==null){breakMs+=Math.max(0,+new Date(e.waktu_server)-breakStart);breakStart=null;}
  }
  if(breakStart!==null&&keluar)breakMs+=Math.max(0,+new Date(keluar.waktu_server)-breakStart);
  return {status,masuk:masuk?.waktu_server??null,keluar:keluar?.waktu_server??null,terlambat:late>shift.tolerance,menit_terlambat:late,kelebihan_toleransi:Math.max(0,late-shift.tolerance),pulang_awal:early,istirahat_menit:Math.round(breakMs/60000),jam_aktual:masuk&&keluar?Math.round(Math.max(0,+new Date(keluar.waktu_server)-+new Date(masuk.waktu_server)-breakMs)/36000)/100:null,konflik_cuti:!!(masuk&&leave)};
}

export async function attendanceRows(from:string,to:string) {
  daysBetween(from,to);
  const people=await prisma.staff.findMany({where:{role:{not:'ADMIN'}},orderBy:{nama:'asc'},include:{area_tugas:true}});
  const rows:any[]=[];
  for(const p of people) {
    const shifts=await ensureShifts(p.id,from,to);
    const events=await prisma.absensi.findMany({where:{staff_id:p.id,waktu_server:{gte:new Date(`${addDays(from,-1)}T00:00:00+07:00`),lt:new Date(`${addDays(to,2)}T00:00:00+07:00`)}},orderBy:{waktu_server:'asc'}});
    const leaves=await prisma.izinCuti.findMany({where:{staff_id:p.id,status:'APPROVED',tanggal_mulai:{lte:new Date(to)},tanggal_selesai:{gte:new Date(from)}}});
    const used=new Set<string>();
    const corrections=await prisma.workforceAudit.findMany({where:{subject_id:{in:shifts.map(s=>s.id)},action:'ATTENDANCE_CORRECTION'},orderBy:{created_at:'desc'}});
    for(const shift of shifts) {
      const assigned=events.filter(e=>e.shift_id===shift.id || (!e.shift_id&&!used.has(e.id)&&+e.waktu_server>=+shift.start_at-2*3600000&&+e.waktu_server<=+shift.end_at+2*3600000));
      assigned.forEach(e=>used.add(e.id));
      const leave=leaves.find(l=>l.tanggal_mulai.toISOString().slice(0,10)<=shift.date&&l.tanggal_selesai.toISOString().slice(0,10)>=shift.date);
      const correction=corrections.find(c=>c.subject_id===shift.id);
      const original=classifyShift(shift,assigned,leave);
      const corrected=correction?.detail as any;
      const result=corrected ? {...classifyShift(shift,[...(corrected.masuk?[{jenis:'MASUK',waktu_server:corrected.masuk}]:[]),...(corrected.keluar?[{jenis:'KELUAR',waktu_server:corrected.keluar}]:[])],leave),status:corrected.status} : original;
      rows.push({...shift,nama:p.nama,nik:p.nik,divisi:p.divisi,area_nama:(shift.area as any)?.nama??p.area_tugas?.nama??'-',...result,original,correction,events:assigned});
    }
    // Keep imported / unscheduled historical attendance visible; never silently drop it.
    const unmatched=events.filter(e=>!used.has(e.id)&&localDate(e.waktu_server)>=from&&localDate(e.waktu_server)<=to);
    for(const date of [...new Set(unmatched.map(e=>localDate(e.waktu_server)))]) {
      const records=unmatched.filter(e=>localDate(e.waktu_server)===date);
      const emptyShift={id:`unscheduled-${p.id}-${date}`,staff_id:p.id,date,start_at:null,end_at:null,tolerance:0,source:'UNSCHEDULED'};
      rows.push({...emptyShift,nama:p.nama,nik:p.nik,divisi:p.divisi,area_nama:p.area_tugas?.nama??'-',status:'TANPA_JADWAL',masuk:records.find(e=>e.jenis==='MASUK')?.waktu_server??null,keluar:records.find(e=>e.jenis==='KELUAR')?.waktu_server??null,terlambat:false,menit_terlambat:0,kelebihan_toleransi:0,pulang_awal:0,jam_aktual:null,events:records});
    }
  }
  return rows;
}

export async function currentShift(staffId:string, action:string) {
  const today=localDate(); const now=Date.now();
  const shifts=await ensureShifts(staffId,addDays(today,-1),today);
  const active=shifts.filter(s=>now>=+s.start_at-2*3600000&&now<=+s.end_at+2*3600000);
  if(action!=='MASUK') {
    for(const s of active) {
      const events=await prisma.absensi.findMany({where:{staff_id:staffId,shift_id:s.id}});
      if(events.some(e=>e.jenis==='MASUK')&&!events.some(e=>e.jenis==='KELUAR')) return s;
    }
  }
  return active.sort((a,b)=>Math.abs(now-+a.start_at)-Math.abs(now-+b.start_at))[0];
}

export async function serial<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>) {
  return prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}
