import 'dotenv/config';
import {
  PrismaClient,
  Role,
  Divisi,
  HariKerja,
  JenisAbsensi,
  KategoriLaporan,
  StatusLaporan,
  StatusKeamanan,
  JenisIzin,
  StatusIzin,
  JenisSerahTerima,
  StatusSerahTerima,
  TipePengumuman,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sharp from 'sharp';
import { uploadFile } from '../src/services/storage.service';
import { generateAndUploadBAST } from '../src/services/pdf.service';
import { localDate, addDays } from '../src/services/workforce.service';

const prisma = new PrismaClient();

function makeTime(dateStr: string, hh: number, mm: number): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  return new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00+07:00`);
}

function makeDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function escXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function createWatermarkedPhoto(
  title: string,
  subtitle: string,
  meta: string,
  bgHex: string,
  accentHex: string,
  filename: string
): Promise<string> {
  const svg = `<svg width="960" height="640" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgHex}"/>
        <stop offset="100%" stop-color="#0b1914"/>
      </linearGradient>
    </defs>
    <rect width="960" height="640" fill="url(#g)"/>
    <rect x="44" y="44" width="872" height="552" rx="22" fill="rgba(255,255,255,0.04)" stroke="${accentHex}" stroke-opacity="0.35" stroke-width="2"/>
    <circle cx="810" cy="145" r="85" fill="${accentHex}" fill-opacity="0.12"/>
    <rect x="78" y="84" width="210" height="38" rx="19" fill="${accentHex}" fill-opacity="0.22"/>
    <text x="183" y="109" text-anchor="middle" fill="${accentHex}" font-family="Arial, sans-serif" font-size="18" font-weight="bold">SIAP OPERASIONAL</text>
    <text x="78" y="240" fill="#ffffff" font-family="Arial, sans-serif" font-size="40" font-weight="bold">${escXml(title)}</text>
    <text x="78" y="294" fill="#d4e6da" font-family="Arial, sans-serif" font-size="24">${escXml(subtitle)}</text>
    <rect x="44" y="470" width="872" height="126" rx="0" fill="rgba(0,0,0,0.45)"/>
    <text x="78" y="518" fill="${accentHex}" font-family="Consolas, monospace" font-size="21" font-weight="bold">VERIFIED WATERMARK | GPS &amp; TIMESTAMP TERCATAT</text>
    <text x="78" y="556" fill="#e6f2ea" font-family="Consolas, monospace" font-size="19">${escXml(meta)}</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return uploadFile(buf, filename, 'image/png');
}

async function createSignaturePng(name: string, filename: string): Promise<{ url: string; base64: string }> {
  const svg = `<svg width="420" height="140" xmlns="http://www.w3.org/2000/svg">
    <rect width="420" height="140" fill="#ffffff"/>
    <path d="M 38 92 C 72 28, 118 118, 165 62 C 198 22, 232 108, 286 58 C 318 32, 348 82, 382 64" stroke="#0c3c24" stroke-width="4" fill="none" stroke-linecap="round"/>
    <text x="210" y="126" text-anchor="middle" fill="#4b5e52" font-family="Arial, sans-serif" font-size="16">${name}</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const url = await uploadFile(buf, filename, 'image/png');
  return { url, base64: buf.toString('base64') };
}

async function main() {
  console.log('Memulai rich seeding database SIAP...\n');
  const today = localDate();
  const now = new Date();
  const thirtyDaysAgo = makeTime(addDays(today, -30), 8, 0);

  // 1. Upload reusable operational photos & signatures to MinIO
  console.log('1. Menyiapkan media dokumentasi & tanda tangan di MinIO...');
  const photoPatroli = await createWatermarkedPhoto(
    'Patroli Keamanan Area Gedung',
    'Pemeriksaan akses gerbang, CCTV, dan panel pos jaga',
    `${today} WIB | Lat -6.2088, Lng 106.8456 | Akurasi 6m`,
    '#0d3b26',
    '#4ae176',
    'rich/patroli-keamanan.png'
  );
  const photoCleaning = await createWatermarkedPhoto(
    'Sanitasi & Pembersihan Area',
    'Pengecekan kebersihan lobby, koridor lantai 1-3, dan toilet',
    `${today} WIB | Lat -6.2080, Lng 106.8440 | Akurasi 8m`,
    '#0f3547',
    '#57c4f7',
    'rich/cleaning-area.png'
  );
  const photoUtility = await createWatermarkedPhoto(
    'Pemeriksaan Panel & Utilitas',
    'Inspeksi genset, pompa air, AC sentral, dan instalasi listrik',
    `${today} WIB | Lat -6.2150, Lng 106.8500 | Akurasi 7m`,
    '#3d2b0d',
    '#f5b942',
    'rich/utility-panel.png'
  );
  const photoSelfie = await createWatermarkedPhoto(
    'Verifikasi Kehadiran Selfie',
    'Validasi lokasi dalam radius area tugas & perangkat resmi',
    `${today} WIB | Perangkat Terdaftar | Anti-Fake-GPS OK`,
    '#0e3622',
    '#34d399',
    'rich/absensi-selfie.png'
  );
  const photoSuratDokter = await createWatermarkedPhoto(
    'Lampiran Keterangan Dokter',
    'Bukti pendukung pengajuan izin atau sakit dari klinik',
    `${today} | Dokumen Terverifikasi Sistem SIAP`,
    '#2f203d',
    '#c084fc',
    'rich/surat-dokter.png'
  );

  const sig1 = await createSignaturePng('Budi Santoso (11001)', 'rich/ttd-budi.png');
  const sig2 = await createSignaturePng('Agus Prasetyo (11002)', 'rich/ttd-agus.png');
  const sig3 = await createSignaturePng('Hendra Wijaya (13001)', 'rich/ttd-hendra.png');
  const sig4 = await createSignaturePng('Rudi Hartono (13002)', 'rich/ttd-rudi.png');

  // 2. Pengaturan Sistem & Area Tugas (5 Area)
  console.log('2. Menyusun Pengaturan Sistem & 5 Area Tugas...');
  await prisma.pengaturanSistem.upsert({
    where: { id: 'singleton' },
    update: { toleransi_keterlambatan_menit: 15 },
    create: { id: 'singleton', toleransi_keterlambatan_menit: 15 },
  });

  const areasDef = [
    { id: 'area-kantor-pusat', nama: 'Kantor Pusat', lat: -6.2088, lng: 106.8456, radius_meter: 50000 },
    { id: 'area-gudang-utama', nama: 'Gudang Utama', lat: -6.2150, lng: 106.8500, radius_meter: 50000 },
    { id: 'area-lobby-utama', nama: 'Lobby Utama', lat: -6.2080, lng: 106.8440, radius_meter: 50000 },
    { id: 'area-gerbang-parkir', nama: 'Gerbang & Parkir Selatan', lat: -6.2112, lng: 106.8474, radius_meter: 500 },
    { id: 'area-ruang-teknik', nama: 'Ruang Teknik & Panel', lat: -6.2128, lng: 106.8432, radius_meter: 500 },
  ];
  const areaMap: Record<string, any> = {};
  for (const a of areasDef) {
    areaMap[a.id] = await prisma.areaTugas.upsert({
      where: { id: a.id },
      update: { nama: a.nama, lat: a.lat, lng: a.lng, radius_meter: a.radius_meter, aktif: true },
      create: { ...a, aktif: true },
    });
  }

  // 3. Staff Accounts (1 Admin + 15 Staff across 3 divisions)
  console.log('3. Menyusun 16 akun pengguna (Admin, Keamanan, Cleaning Service, Utility)...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.staff.upsert({
    where: { nik: '00001' },
    update: { nama: 'Administrator SIAP', role: Role.ADMIN, divisi: Divisi.MANAJEMEN, aktif: true },
    create: {
      nik: '00001',
      nama: 'Administrator SIAP',
      password_hash: adminPassword,
      role: Role.ADMIN,
      divisi: Divisi.MANAJEMEN,
      aktif: true,
      created_at: thirtyDaysAgo,
    },
  });

  const staffDefs = [
    // KEAMANAN (5)
    { nik: '11001', nama: 'Budi Santoso', role: Role.SATPAM, divisi: Divisi.KEAMANAN, area: 'area-kantor-pusat', shift: ['14:00', '23:00'] },
    { nik: '11002', nama: 'Agus Prasetyo', role: Role.SATPAM, divisi: Divisi.KEAMANAN, area: 'area-gudang-utama', shift: ['22:00', '06:00'] },
    { nik: '11003', nama: 'Arif Pratama', role: Role.SATPAM, divisi: Divisi.KEAMANAN, area: 'area-kantor-pusat', shift: ['07:00', '15:00'] },
    { nik: '11004', nama: 'Dimas Saputra', role: Role.SATPAM, divisi: Divisi.KEAMANAN, area: 'area-gerbang-parkir', shift: ['07:00', '15:00'] },
    { nik: '11005', nama: 'Fajar Ramadhan', role: Role.SATPAM, divisi: Divisi.KEAMANAN, area: 'area-lobby-utama', shift: ['14:00', '22:00'] },
    // CLEANING SERVICE (5)
    { nik: '12001', nama: 'Dewi Rahayu', role: Role.CS, divisi: Divisi.CLEANING_SERVICE, area: 'area-lobby-utama', shift: ['07:00', '16:00'] },
    { nik: '12002', nama: 'Sari Wulandari', role: Role.CS, divisi: Divisi.CLEANING_SERVICE, area: 'area-kantor-pusat', shift: ['08:00', '17:00'] },
    { nik: '12003', nama: 'Nadia Putri', role: Role.CS, divisi: Divisi.CLEANING_SERVICE, area: 'area-lobby-utama', shift: ['07:00', '16:00'] },
    { nik: '12004', nama: 'Rina Anggraini', role: Role.CS, divisi: Divisi.CLEANING_SERVICE, area: 'area-kantor-pusat', shift: ['13:00', '21:00'] },
    { nik: '12005', nama: 'Maya Lestari', role: Role.CS, divisi: Divisi.CLEANING_SERVICE, area: 'area-gudang-utama', shift: ['08:00', '17:00'] },
    // UTILITY (5)
    { nik: '13001', nama: 'Hendra Wijaya', role: Role.UTILITY, divisi: Divisi.UTILITY, area: 'area-kantor-pusat', shift: ['08:00', '17:00'] },
    { nik: '13002', nama: 'Rudi Hartono', role: Role.UTILITY, divisi: Divisi.UTILITY, area: 'area-gudang-utama', shift: ['08:00', '17:00'] },
    { nik: '13003', nama: 'Rizky Maulana', role: Role.UTILITY, divisi: Divisi.UTILITY, area: 'area-ruang-teknik', shift: ['07:00', '16:00'] },
    { nik: '13004', nama: 'Andi Setiawan', role: Role.UTILITY, divisi: Divisi.UTILITY, area: 'area-kantor-pusat', shift: ['14:00', '22:00'] },
    { nik: '13005', nama: 'Bima Nugraha', role: Role.UTILITY, divisi: Divisi.UTILITY, area: 'area-ruang-teknik', shift: ['08:00', '17:00'] },
  ];

  const staffMap: Record<string, any> = {};
  for (const s of staffDefs) {
    const existing = await prisma.staff.findUnique({ where: { nik: s.nik } });
    if (existing) {
      staffMap[s.nik] = await prisma.staff.update({
        where: { nik: s.nik },
        data: {
          nama: s.nama,
          role: s.role,
          divisi: s.divisi,
          area_tugas_id: s.area,
          aktif: true,
        },
      });
    } else {
      staffMap[s.nik] = await prisma.staff.create({
        data: {
          nik: s.nik,
          nama: s.nama,
          password_hash: staffPassword,
          role: s.role,
          divisi: s.divisi,
          area_tugas_id: s.area,
          aktif: true,
          created_at: thirtyDaysAgo,
        },
      });
    }
  }

  // 4. Jadwal Kerja Mingguan + ScheduleVersion
  console.log('4. Menyiapkan jadwal kerja mingguan & versi jadwal...');
  const allDays: HariKerja[] = [
    HariKerja.SENIN,
    HariKerja.SELASA,
    HariKerja.RABU,
    HariKerja.KAMIS,
    HariKerja.JUMAT,
    HariKerja.SABTU,
  ];
  const weekdayNames = ['AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

  for (const s of staffDefs) {
    const person = staffMap[s.nik];
    const [jamMasuk, jamKeluar] = s.shift;
    const weeklyRows: any[] = [];
    for (const hari of allDays) {
      const row = await prisma.jadwalKerja.upsert({
        where: { staff_id_hari: { staff_id: person.id, hari } },
        update: { jam_masuk: jamMasuk, jam_keluar: jamKeluar, aktif: true },
        create: { staff_id: person.id, hari, jam_masuk: jamMasuk, jam_keluar: jamKeluar, aktif: true },
      });
      weeklyRows.push(row);
    }
    // Remove old schedule versions after 2026-10-01 so all 14 days use clean SCHEDULE
    await prisma.scheduleVersion.deleteMany({ where: { staff_id: person.id } });
    await prisma.scheduleVersion.create({
      data: {
        staff_id: person.id,
        effective_date: '2026-10-01',
        schedule: weeklyRows,
        actor_id: admin.id,
      },
    });
  }

  // 5. Registered Devices (preserve Budi's existing approved phone + add others)
  console.log('5. Menyiapkan perangkat HP terdaftar (Approved & Pending)...');
  const existingBudiDevice = await prisma.registeredDevice.findFirst({
    where: { staff_id: staffMap['11001'].id, status: 'APPROVED' },
  });

  const deviceDefs = [
    { id: 'rich-dev-11002', nik: '11002', label: 'Samsung Galaxy A35 5G', status: 'APPROVED', reason: 'Perangkat utama operasional lapangan' },
    { id: 'rich-dev-11003', nik: '11003', label: 'Xiaomi Redmi Note 13 Pro', status: 'APPROVED', reason: 'Perangkat resmi pos utama' },
    { id: 'rich-dev-11004', nik: '11004', label: 'Oppo A78 5G', status: 'PENDING', reason: 'Penggantian HP baru karena layar lama retak' },
    { id: 'rich-dev-12001', nik: '12001', label: 'Samsung Galaxy A54', status: 'APPROVED', reason: 'Perangkat dinas Cleaning Service Lobby' },
    { id: 'rich-dev-12002', nik: '12002', label: 'Vivo Y28', status: 'APPROVED', reason: 'Perangkat operasional gedung' },
    { id: 'rich-dev-12003', nik: '12003', label: 'Realme 12 Plus', status: 'PENDING', reason: 'Pendaftaran awal HP petugas baru' },
    { id: 'rich-dev-13001', nik: '13001', label: 'Samsung Galaxy A55 5G', status: 'APPROVED', reason: 'Perangkat resmi teknisi Utility' },
    { id: 'rich-dev-13002', nik: '13002', label: 'Xiaomi Poco X6', status: 'APPROVED', reason: 'Perangkat operasional Gudang Utama' },
  ];
  const deviceByNik: Record<string, string> = {};
  if (existingBudiDevice) {
    deviceByNik['11001'] = existingBudiDevice.id;
  }
  for (const d of deviceDefs) {
    const person = staffMap[d.nik];
    const existingForStaff = await prisma.registeredDevice.findFirst({
      where: { staff_id: person.id, status: d.status },
    });
    if (existingForStaff && existingForStaff.id !== d.id) {
      deviceByNik[d.nik] = existingForStaff.id;
      continue;
    }
    const fakeKey = crypto.createHash('sha256').update(`siap-key-${d.id}`).digest('base64') + '==' + d.id;
    const saved = await prisma.registeredDevice.upsert({
      where: { id: d.id },
      update: {
        label: d.label,
        status: d.status,
        reason: d.reason,
        reviewed_by: d.status === 'APPROVED' ? admin.id : null,
        reviewed_at: d.status === 'APPROVED' ? makeTime(addDays(today, -10), 9, 0) : null,
        last_used_at: d.status === 'APPROVED' ? makeTime(today, 8, 5) : null,
      },
      create: {
        id: d.id,
        staff_id: person.id,
        public_key: fakeKey,
        label: d.label,
        status: d.status,
        reason: d.reason,
        reviewed_by: d.status === 'APPROVED' ? admin.id : null,
        reviewed_at: d.status === 'APPROVED' ? makeTime(addDays(today, -10), 9, 0) : null,
        last_used_at: d.status === 'APPROVED' ? makeTime(today, 8, 5) : null,
      },
    });
    deviceByNik[d.nik] = saved.id;
  }

  // 6. ShiftInstance + Absensi (14 hari terakhir sampai hari ini)
  console.log('6. Menyiapkan ShiftInstance & riwayat Absensi 14 hari + hari ini...');
  // Clean non-preserved shift/absensi for rich seed reproducibility (keep nothing stale)
  const allStaffIds = staffDefs.map((s) => staffMap[s.nik].id);
  const fourteenDaysAgoDate = addDays(today, -13);
  await prisma.absensi.deleteMany({
    where: {
      staff_id: { in: allStaffIds },
      waktu_server: { gte: makeTime(fourteenDaysAgoDate, 0, 0) },
    },
  });
  await prisma.shiftInstance.deleteMany({
    where: {
      staff_id: { in: allStaffIds },
      date: { gte: fourteenDaysAgoDate, lte: today },
    },
  });

  for (let idx = 0; idx < staffDefs.length; idx++) {
    const s = staffDefs[idx];
    const person = staffMap[s.nik];
    const area = areaMap[s.area];
    const [jamMasuk, jamKeluar] = s.shift;
    const [mh, mm] = jamMasuk.split(':').map(Number);
    const [kh, km] = jamKeluar.split(':').map(Number);

    for (let offset = -13; offset <= 0; offset++) {
      const dateStr = addDays(today, offset);
      const dayIdx = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
      if (weekdayNames[dayIdx] === 'AHAD') continue;

      const startAt = makeTime(dateStr, mh, mm);
      const endDateStr = jamKeluar <= jamMasuk ? addDays(dateStr, 1) : dateStr;
      const endAt = makeTime(endDateStr, kh, km);

      const shift = await prisma.shiftInstance.create({
        data: {
          staff_id: person.id,
          date: dateStr,
          start_at: startAt,
          end_at: endAt,
          tolerance: 15,
          source: 'SCHEDULE',
          area: area,
        },
      });

      // Leave 2 staff on approved leave today (12005 Maya Lestari = CUTI, 13005 Bima Nugraha = SAKIT)
      if (offset === 0 && (s.nik === '12005' || s.nik === '13005')) continue;
      // Leave 1 staff today not checked in yet (11002 Agus Prasetyo shift malam 22:00)
      if (offset === 0 && s.nik === '11002') continue;
      // Occasional absence on historical days for realistic chart variance
      if (offset < 0 && (idx + Math.abs(offset)) % 11 === 0) continue;

      // Determine lateness (realistic: mostly on time, occasional 19-32 min late)
      const isLate = (offset === 0 && (s.nik === '11004' || s.nik === '12002')) || (offset < 0 && (idx + Math.abs(offset)) % 7 === 0);
      const lateMin = isLate ? 19 + ((idx * 3 + Math.abs(offset)) % 14) : ((idx + Math.abs(offset)) % 8);

      const masukTime = new Date(startAt.getTime() + lateMin * 60000);
      const breakStartTime = new Date(startAt.getTime() + 4 * 3600000);
      const breakEndTime = new Date(startAt.getTime() + 5 * 3600000);
      const keluarTime = new Date(endAt.getTime() + 4 * 60000);

      const jitterLat = area.lat + ((idx % 5) - 2) * 0.00035;
      const jitterLng = area.lng + ((idx % 3) - 1) * 0.00035;
      const deviceId = deviceByNik[s.nik] || null;

      // Today: keep Budi Santoso (11001) ACTIVE on shift (MASUK + ISTIRAHAT + SELESAI ISTIRAHAT, not yet KELUAR)
      // so Beranda shows "Sedang Bertugas" and Absensi shows active ABSEN KELUAR button + 3 timeline items!
      const eventsToCreate: Array<{ jenis: JenisAbsensi; waktu: Date; foto: string | null }> = [];
      if (masukTime <= now) {
        eventsToCreate.push({ jenis: JenisAbsensi.MASUK, waktu: masukTime, foto: photoSelfie });
      }
      if (breakStartTime <= now && !(offset === 0 && s.nik === '11005')) {
        eventsToCreate.push({ jenis: JenisAbsensi.MULAI_ISTIRAHAT, waktu: breakStartTime, foto: null });
      }
      if (breakEndTime <= now && !(offset === 0 && (s.nik === '11005' || s.nik === '12004'))) {
        eventsToCreate.push({ jenis: JenisAbsensi.SELESAI_ISTIRAHAT, waktu: breakEndTime, foto: null });
      }
      if (keluarTime <= now && !(offset === 0 && s.nik === '11001')) {
        eventsToCreate.push({ jenis: JenisAbsensi.KELUAR, waktu: keluarTime, foto: photoSelfie });
      }

      for (const ev of eventsToCreate) {
        await prisma.absensi.create({
          data: {
            staff_id: person.id,
            shift_id: shift.id,
            device_id: deviceId,
            jenis: ev.jenis,
            waktu_server: ev.waktu,
            foto_url: ev.foto,
            lat: jitterLat,
            lng: jitterLng,
            akurasi_gps: 6 + (idx % 9),
            catatan: ev.jenis === JenisAbsensi.MASUK && isLate ? 'Kendala kemacetan di jalan utama' : null,
            evidence: {
              device: deviceDefs.find((d) => d.nik === s.nik)?.label || 'Samsung Galaxy A55 5G',
              mock: false,
              verified: true,
            },
          },
        });
      }
    }
  }

  // 7. Offline Pending Proofs (2 items for Rekap & Dashboard Queue)
  console.log('7. Menyiapkan 2 bukti absensi offline menunggu verifikasi...');
  const offlineItems = [
    {
      id: 'offline-rich-001',
      nik: '13002',
      action: 'MASUK',
      captured_at: makeTime(today, 8, 2).getTime(),
      device: 'Xiaomi Poco X6',
      lat: -6.2151,
      lng: 106.8501,
    },
    {
      id: 'offline-rich-002',
      nik: '12004',
      action: 'MASUK',
      captured_at: makeTime(today, 13, 4).getTime(),
      device: 'Samsung Galaxy A34',
      lat: -6.2089,
      lng: 106.8455,
    },
  ];
  for (const off of offlineItems) {
    const p = staffMap[off.nik];
    await prisma.workforceAudit.upsert({
      where: { id: off.id },
      update: {
        actor_id: p.id,
        subject_id: off.id,
        action: 'OFFLINE_PENDING',
        reason: 'Sinyal seluler terputus di area basement saat absen masuk',
        detail: {
          id: off.id,
          staff_id: p.id,
          action: off.action,
          lat: off.lat,
          lng: off.lng,
          accuracy: 11,
          captured_at: off.captured_at,
          mock: false,
          device: off.device,
          photo: photoSelfie,
        },
      },
      create: {
        id: off.id,
        actor_id: p.id,
        subject_id: off.id,
        action: 'OFFLINE_PENDING',
        reason: 'Sinyal seluler terputus di area basement saat absen masuk',
        detail: {
          id: off.id,
          staff_id: p.id,
          action: off.action,
          lat: off.lat,
          lng: off.lng,
          accuracy: 11,
          captured_at: off.captured_at,
          mock: false,
          device: off.device,
          photo: photoSelfie,
        },
      },
    });
  }

  // 8. Laporan Harian (18 laporan realistis, 8 hari ini + 5 milik Budi Santoso)
  console.log('8. Menyiapkan 18 Laporan Kegiatan Harian across 3 divisi...');
  const laporanDefs: Array<{
    id: string;
    nik: string;
    divisi: Divisi;
    kategori: KategoriLaporan;
    judul: string;
    deskripsi: string;
    foto: string;
    status: StatusLaporan;
    komentar: string | null;
    dayOffset: number;
    hh: number;
    mm: number;
  }> = [
    // Today's reports (visible immediately on Web Admin /laporan default view)
    {
      id: 'rich-lap-01',
      nik: '11001',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.PATROLI,
      judul: 'Patroli Rutin Area Parkir & Gerbang Utama',
      deskripsi: 'Melakukan pemeriksaan keliling area parkir motor, parkir mobil tamu, pos gerbang depan, serta memastikan seluruh kamera CCTV dan lampu penerangan perimeter menyala normal tanpa kendala.',
      foto: photoPatroli,
      status: StatusLaporan.APPROVED,
      komentar: 'Laporan patroli lengkap dan dokumentasi jelas. Pertahankan kewaspadaan area gerbang belakang.',
      dayOffset: 0,
      hh: 15,
      mm: 20,
    },
    {
      id: 'rich-lap-02',
      nik: '11001',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.PENJAGAAN,
      judul: 'Pengecekan Akses Tamu & Logistik Sore',
      deskripsi: 'Mencatat kedatangan 4 kendaraan pengiriman logistik, memverifikasi surat jalan di pos keamanan, dan mengawal proses bongkar muat hingga selesai di area loading dock.',
      foto: photoPatroli,
      status: StatusLaporan.SUBMITTED,
      komentar: null,
      dayOffset: 0,
      hh: 17,
      mm: 45,
    },
    {
      id: 'rich-lap-03',
      nik: '12001',
      divisi: Divisi.CLEANING_SERVICE,
      kategori: KategoriLaporan.PEMBERSIHAN_AREA,
      judul: 'Pembersihan Menyeluruh Lobby Utama & Resepsionis',
      deskripsi: 'Pengepelan lantai granit lobby, pembersihan kaca pintu masuk otomatis, pengelapan meja resepsionis, serta penataan ruang tunggu tamu sebelum jam operasional dimulai.',
      foto: photoCleaning,
      status: StatusLaporan.APPROVED,
      komentar: 'Area lobby sangat bersih dan rapi, terima kasih.',
      dayOffset: 0,
      hh: 9,
      mm: 15,
    },
    {
      id: 'rich-lap-04',
      nik: '12002',
      divisi: Divisi.CLEANING_SERVICE,
      kategori: KategoriLaporan.SANITASI_TOILET,
      judul: 'Sanitasi Toilet Lantai 1 hingga Lantai 3',
      deskripsi: 'Pembersihan kloset, wastafel, cermin, pengisian ulang sabun cuci tangan dan tisu gulung, serta pengecekan aroma ruangan pada seluruh toilet pria dan wanita.',
      foto: photoCleaning,
      status: StatusLaporan.SUBMITTED,
      komentar: null,
      dayOffset: 0,
      hh: 11,
      mm: 30,
    },
    {
      id: 'rich-lap-05',
      nik: '13001',
      divisi: Divisi.UTILITY,
      kategori: KategoriLaporan.PEMERIKSAAN_RUTIN,
      judul: 'Inspeksi Harian Panel Listrik & Genset Utama',
      deskripsi: 'Pengecekan tegangan panel LVMDP stabil di 380V, level bahan bakar solar genset 85%, temperatur mesin normal, dan indikator ATS dalam posisi siap otomatis.',
      foto: photoUtility,
      status: StatusLaporan.APPROVED,
      komentar: 'Parameter kelistrikan tercatat lengkap.',
      dayOffset: 0,
      hh: 10,
      mm: 5,
    },
    {
      id: 'rich-lap-06',
      nik: '13003',
      divisi: Divisi.UTILITY,
      kategori: KategoriLaporan.PERBAIKAN,
      judul: 'Perbaikan Kebocoran Pipa AC Ruang Rapat Lt. 2',
      deskripsi: 'Membersihkan saluran pembuangan drain AC split yang tersumbat, mengganti isolasi pipa tembaga yang lembap, serta menguji unit selama 30 menit tanpa tetesan air.',
      foto: photoUtility,
      status: StatusLaporan.SUBMITTED,
      komentar: null,
      dayOffset: 0,
      hh: 13,
      mm: 40,
    },
    {
      id: 'rich-lap-07',
      nik: '11003',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.INSIDEN,
      judul: 'Temuan Pintu Darurat Lantai 2 Tidak Terkunci Rapat',
      deskripsi: 'Saat patroli pagi ditemukan grendel pintu darurat sisi timur tidak menutup sempurna. Sudah segera diamankan sementara dan dikoordinasikan dengan tim Utility untuk penyetelan engsel.',
      foto: photoPatroli,
      status: StatusLaporan.SUBMITTED,
      komentar: null,
      dayOffset: 0,
      hh: 10,
      mm: 50,
    },
    {
      id: 'rich-lap-08',
      nik: '12003',
      divisi: Divisi.CLEANING_SERVICE,
      kategori: KategoriLaporan.STOK_PERLENGKAPAN,
      judul: 'Laporan Stok Cairan Disinfektan & Plastik Sampah',
      deskripsi: 'Stok cairan pembersih lantai tersisa 3 jerigen, disinfektan tersisa 2 botol, dan kantong plastik sampah ukuran besar perlu penambahan untuk minggu depan.',
      foto: photoCleaning,
      status: StatusLaporan.REJECTED,
      komentar: 'Mohon lampirkan rincian jumlah kebutuhan dalam tabel serta foto gudang perlengkapan.',
      dayOffset: 0,
      hh: 14,
      mm: 10,
    },
    // Additional Budi Santoso reports (for rich Mobile ListLaporanScreen)
    {
      id: 'rich-lap-09',
      nik: '11001',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.PENGAWALAN,
      judul: 'Pengawalan Tamu VIP Manajemen & Parkir Khusus',
      deskripsi: 'Melaksanakan pengamanan kedatangan tamu direksi dari gerbang utama menuju lobby VIP, pengaturan jalur parkir khusus, dan pendampingan hingga selesai kunjungan.',
      foto: photoPatroli,
      status: StatusLaporan.APPROVED,
      komentar: 'Pelaksanaan pengawalan berjalan tertib dan profesional.',
      dayOffset: -1,
      hh: 16,
      mm: 30,
    },
    {
      id: 'rich-lap-10',
      nik: '11001',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.PEMELIHARAAN,
      judul: 'Pengecekan Baterai Radio HT & Senter Patroli',
      deskripsi: 'Pengecekan 4 unit Radio HT pos utama dan 2 senter patroli LED. Satu baterai cadangan mulai menurun dayanya dan perlu penggantian.',
      foto: photoPatroli,
      status: StatusLaporan.REJECTED,
      komentar: 'Mohon cantumkan nomor seri unit Radio HT yang baterainya bermasalah.',
      dayOffset: -2,
      hh: 19,
      mm: 15,
    },
    {
      id: 'rich-lap-11',
      nik: '11001',
      divisi: Divisi.KEAMANAN,
      kategori: KategoriLaporan.PATROLI,
      judul: 'Draft Patroli Malam Area Gudang Belakang',
      deskripsi: 'Catatan sementara pemeriksaan kunci gembok pagar belakang, lampu sorot sisi barat, dan area penyimpanan palet logistik.',
      foto: photoPatroli,
      status: StatusLaporan.DRAFT,
      komentar: null,
      dayOffset: 0,
      hh: 20,
      mm: 10,
    },
    // Additional past reports from other divisions
    {
      id: 'rich-lap-12',
      nik: '12004',
      divisi: Divisi.CLEANING_SERVICE,
      kategori: KategoriLaporan.PENGELOLAAN_SAMPAH,
      judul: 'Pemilahan & Pengangkutan Sampah Operasional Sore',
      deskripsi: 'Memisahkan sampah organik dan anorganik dari seluruh lantai kantor serta memindahkannya ke TPS belakang sesuai jadwal pengangkutan.',
      foto: photoCleaning,
      status: StatusLaporan.APPROVED,
      komentar: 'Sudah sesuai prosedur pengelolaan sampah.',
      dayOffset: -1,
      hh: 18,
      mm: 0,
    },
    {
      id: 'rich-lap-13',
      nik: '13002',
      divisi: Divisi.UTILITY,
      kategori: KategoriLaporan.KERUSAKAN,
      judul: 'Penggantian Lampu LED Koridor Gudang B',
      deskripsi: 'Mengganti 3 buah lampu tabung LED 18W yang berkedip di koridor Gudang B dengan unit baru sehingga pencahayaan kembali terang dan aman.',
      foto: photoUtility,
      status: StatusLaporan.APPROVED,
      komentar: 'Tindak lanjut cepat dan rapi.',
      dayOffset: -1,
      hh: 11,
      mm: 20,
    },
  ];

  for (const l of laporanDefs) {
    const person = staffMap[l.nik];
    const dateStr = addDays(today, l.dayOffset);
    await prisma.laporan.upsert({
      where: { id: l.id },
      update: {
        staff_id: person.id,
        divisi: l.divisi,
        kategori: l.kategori,
        judul: l.judul,
        deskripsi: l.deskripsi,
        foto_urls: [l.foto],
        status: l.status,
        komentar_admin: l.komentar,
        created_at: makeTime(dateStr, l.hh, l.mm),
      },
      create: {
        id: l.id,
        staff_id: person.id,
        divisi: l.divisi,
        kategori: l.kategori,
        judul: l.judul,
        deskripsi: l.deskripsi,
        foto_urls: [l.foto],
        status: l.status,
        komentar_admin: l.komentar,
        created_at: makeTime(dateStr, l.hh, l.mm),
      },
    });
  }

  // 9. Laporan Per 3 Jam Satpam (Today + Yesterday across all Satpam)
  console.log('9. Menyiapkan Laporan Rutin Per 3 Jam Satpam...');
  const perJamEntries = [
    // Budi Santoso (11001) shift 14:00 - 23:00 -> slots 14, 17, 20 today!
    { nik: '11001', dayOffset: 0, jam: 14, status: StatusKeamanan.AMAN, catatan: 'Kondisi pos utama, lobby, dan gerbang depan aman terkendali. Lalu lintas tamu tertib.' },
    { nik: '11001', dayOffset: 0, jam: 17, status: StatusKeamanan.AMAN, catatan: 'Patroli jam pulang karyawan selesai. Seluruh kendaraan keluar terpantau lancar.' },
    { nik: '11001', dayOffset: 0, jam: 20, status: StatusKeamanan.PERLU_PERIKSA, catatan: 'Lampu sorot sudut parkir timur berkedip, sudah diinformasikan ke tim Utility.' },
    // Arif Pratama (11003) shift pagi 07:00 - 15:00
    { nik: '11003', dayOffset: 0, jam: 7, status: StatusKeamanan.AMAN, catatan: 'Serah terima shift pagi selesai. Area depan dan pagar perimeter aman.' },
    { nik: '11003', dayOffset: 0, jam: 10, status: StatusKeamanan.ADA_TEMUAN, catatan: 'Ditemukan pintu darurat lantai 2 kurang rapat, langsung diamankan.' },
    { nik: '11003', dayOffset: 0, jam: 13, status: StatusKeamanan.AMAN, catatan: 'Area kantin, parkir tamu, dan ruang server dalam kondisi aman.' },
    // Dimas Saputra (11004)
    { nik: '11004', dayOffset: 0, jam: 7, status: StatusKeamanan.AMAN, catatan: 'Portal parkir selatan dibuka pukul 07.00, sistem karcis beroperasi normal.' },
    { nik: '11004', dayOffset: 0, jam: 10, status: StatusKeamanan.AMAN, catatan: 'Patroli area parkir motor dan mobil berjalan lancar tanpa temuan.' },
    { nik: '11004', dayOffset: 0, jam: 13, status: StatusKeamanan.AMAN, catatan: 'Pemantauan arus kendaraan bongkar muat logistik aman.' },
    // Fajar Ramadhan (11005)
    { nik: '11005', dayOffset: 0, jam: 14, status: StatusKeamanan.AMAN, catatan: 'Penjagaan pintu masuk lobby utama dan pemeriksaan kartu akses pengunjung.' },
    { nik: '11005', dayOffset: 0, jam: 17, status: StatusKeamanan.AMAN, catatan: 'Sterilisasi area lobby dan penutupan akses lantai perkantoran berjalan tertib.' },
    { nik: '11005', dayOffset: 0, jam: 20, status: StatusKeamanan.AMAN, catatan: 'Seluruh pintu akses lobby terkunci otomatis dan terpantau CCTV.' },
  ];
  for (const pj of perJamEntries) {
    const person = staffMap[pj.nik];
    const dateStr = addDays(today, pj.dayOffset);
    await prisma.laporanPerJam.upsert({
      where: {
        staff_id_tanggal_jam: {
          staff_id: person.id,
          tanggal: makeDateOnly(dateStr),
          jam: pj.jam,
        },
      },
      update: {
        status_keamanan: pj.status,
        foto_url: photoPatroli,
        catatan: pj.catatan,
        created_at: makeTime(dateStr, pj.jam, 8),
      },
      create: {
        staff_id: person.id,
        tanggal: makeDateOnly(dateStr),
        jam: pj.jam,
        status_keamanan: pj.status,
        foto_url: photoPatroli,
        catatan: pj.catatan,
        created_at: makeTime(dateStr, pj.jam, 8),
      },
    });
  }

  // 10. Izin & Cuti + Leave Ledger (10 pengajuan realistis)
  console.log('10. Menyiapkan 10 pengajuan Izin/Cuti/Sakit & Kuota Cuti Tahunan...');
  const year = Number(today.slice(0, 4));
  // Ensure 12-day annual leave quota for all 15 staff
  for (const s of staffDefs) {
    const p = staffMap[s.nik];
    const existingQuota = await prisma.leaveLedger.findFirst({
      where: { staff_id: p.id, year, kind: 'QUOTA' },
    });
    if (!existingQuota) {
      await prisma.leaveLedger.create({
        data: {
          staff_id: p.id,
          year,
          days: 12,
          kind: 'QUOTA',
          actor_id: admin.id,
          reason: `Kuota cuti tahunan ${year}`,
        },
      });
    }
  }

  const izinDefs = [
    // Active approved today (Maya Lestari & Bima Nugraha)
    { id: 'rich-izin-01', nik: '12005', jenis: JenisIzin.CUTI, startOff: 0, endOff: 1, status: StatusIzin.APPROVED, ket: 'Cuti tahunan keperluan acara keluarga di luar kota.', komentar: 'Disetujui. Area Gudang Utama dicover oleh Sari Wulandari.', foto: null },
    { id: 'rich-izin-02', nik: '13005', jenis: JenisIzin.SAKIT, startOff: 0, endOff: 0, status: StatusIzin.APPROVED, ket: 'Demam tinggi dan disarankan istirahat 1 hari oleh dokter klinik.', komentar: 'Disetujui sesuai surat keterangan dokter. Semoga lekas sembuh.', foto: photoSuratDokter },
    // Pending requests (for Admin queue & review)
    { id: 'rich-izin-03', nik: '11001', jenis: JenisIzin.CUTI, startOff: 5, endOff: 6, status: StatusIzin.PENDING, ket: 'Mengajukan cuti tahunan 2 hari untuk menghadiri pernikahan adik kandung.', komentar: null, foto: null },
    { id: 'rich-izin-04', nik: '12003', jenis: JenisIzin.IZIN, startOff: 2, endOff: 2, status: StatusIzin.PENDING, ket: 'Izin mengurus perpanjangan dokumen kependudukan di kelurahan.', komentar: null, foto: null },
    { id: 'rich-izin-05', nik: '13004', jenis: JenisIzin.SAKIT, startOff: 1, endOff: 1, status: StatusIzin.PENDING, ket: 'Kontrol kesehatan rutin ke rumah sakit sesuai rujukan.', komentar: null, foto: photoSuratDokter },
    // Historical requests for Budi Santoso (11001) so Mobile Riwayat Saya looks complete
    { id: 'rich-izin-06', nik: '11001', jenis: JenisIzin.IZIN, startOff: -8, endOff: -8, status: StatusIzin.APPROVED, ket: 'Izin mengantar orang tua pemeriksaan kesehatan pagi hari.', komentar: 'Disetujui. Terima kasih sudah konfirmasi pengganti shift.', foto: null },
    { id: 'rich-izin-07', nik: '11001', jenis: JenisIzin.SAKIT, startOff: -15, endOff: -15, status: StatusIzin.APPROVED, ket: 'Flu berat dan istirahat atas saran dokter.', komentar: 'Surat dokter diterima dan disetujui.', foto: photoSuratDokter },
    // Other historical requests
    { id: 'rich-izin-08', nik: '11004', jenis: JenisIzin.CUTI, startOff: -5, endOff: -4, status: StatusIzin.APPROVED, ket: 'Cuti keluarga akhir pekan.', komentar: 'Disetujui.', foto: null },
    { id: 'rich-izin-09', nik: '12001', jenis: JenisIzin.CUTI, startOff: 10, endOff: 11, status: StatusIzin.REJECTED, ket: 'Pengajuan cuti bersamaan dengan jadwal audit kebersihan gedung.', komentar: 'Mohon dijadwalkan ulang setelah audit kebersihan selesai.', foto: null },
  ];

  for (const iz of izinDefs) {
    const p = staffMap[iz.nik];
    const startStr = addDays(today, iz.startOff);
    const endStr = addDays(today, iz.endOff);
    await prisma.izinCuti.upsert({
      where: { id: iz.id },
      update: {
        staff_id: p.id,
        jenis: iz.jenis,
        tanggal_mulai: makeDateOnly(startStr),
        tanggal_selesai: makeDateOnly(endStr),
        keterangan: iz.ket,
        foto_url: iz.foto,
        status: iz.status,
        komentar_admin: iz.komentar,
        reviewed_by: iz.status !== StatusIzin.PENDING ? admin.id : null,
        reviewed_at: iz.status !== StatusIzin.PENDING ? makeTime(today, 9, 30) : null,
      },
      create: {
        id: iz.id,
        staff_id: p.id,
        jenis: iz.jenis,
        tanggal_mulai: makeDateOnly(startStr),
        tanggal_selesai: makeDateOnly(endStr),
        keterangan: iz.ket,
        foto_url: iz.foto,
        status: iz.status,
        komentar_admin: iz.komentar,
        reviewed_by: iz.status !== StatusIzin.PENDING ? admin.id : null,
        reviewed_at: iz.status !== StatusIzin.PENDING ? makeTime(today, 9, 30) : null,
      },
    });
  }

  // 11. Serah Terima / BAST (7 records: PIKET & PERALATAN, SELESAI with PDF + PENDING + Inventaris Bermasalah)
  console.log('11. Menyiapkan 7 dokumen Serah Terima (BAST) & Inventaris Bermasalah...');
  const bastDefs = [
    {
      id: 'rich-bast-01',
      lama: '11003',
      baru: '11001',
      jenis: JenisSerahTerima.PIKET,
      dayOffset: 0,
      status: StatusSerahTerima.PENDING,
      catatan: 'Serah terima shift pagi ke shift siang Pos Utama. Mohon konfirmasi tanda tangan penerima.',
      barang: [
        { nama: 'Kunci Gerbang Utama', kondisi: 'BAIK', catatan: 'Lengkap 2 set kunci utama dan gembok' },
        { nama: 'Radio HT Pos Utama', kondisi: 'BAIK', catatan: 'Baterai 90%, sinyal jernih' },
        { nama: 'Senter Patroli LED', kondisi: 'RUSAK', catatan: 'Tombol saklar kadang macet, perlu pengecekan' },
        { nama: 'Buku Mutasi & Log Tamu', kondisi: 'BAIK', catatan: 'Tercatat lengkap sampai pukul 14.00 WIB' },
      ],
    },
    {
      id: 'rich-bast-02',
      lama: '11001',
      baru: '11002',
      jenis: JenisSerahTerima.PIKET,
      dayOffset: -1,
      status: StatusSerahTerima.SELESAI,
      catatan: 'Serah terima shift siang ke shift malam berjalan lengkap dan aman.',
      barang: [
        { nama: 'Kunci Gerbang Utama', kondisi: 'BAIK', catatan: 'Lengkap dan berfungsi normal' },
        { nama: 'Radio HT Pos Utama', kondisi: 'BAIK', catatan: 'Terisi penuh di dock charger' },
        { nama: 'Senter Patroli LED', kondisi: 'BAIK', catatan: 'Siap pakai untuk patroli malam' },
        { nama: 'Tongkat Keamanan', kondisi: 'BAIK', catatan: 'Terpasang rapi di rak pos jaga' },
      ],
    },
    {
      id: 'rich-bast-03',
      lama: '11004',
      baru: '11005',
      jenis: JenisSerahTerima.PIKET,
      dayOffset: 0,
      status: StatusSerahTerima.SELESAI,
      catatan: 'Pergantian shift penjagaan Gerbang Selatan ke Lobby Utama.',
      barang: [
        { nama: 'Kunci Portal Parkir', kondisi: 'BAIK', catatan: 'Normal' },
        { nama: 'Rompi Reflektif', kondisi: 'HILANG', catatan: '1 rompi cadangan belum dikembalikan dari area loading dock' },
        { nama: 'Radio HT Gerbang', kondisi: 'BAIK', catatan: 'Normal' },
      ],
    },
    {
      id: 'rich-bast-04',
      lama: '13001',
      baru: '13004',
      jenis: JenisSerahTerima.PERALATAN,
      dayOffset: 0,
      status: StatusSerahTerima.SELESAI,
      catatan: 'Serah terima peralatan teknik dari shift pagi ke shift sore.',
      barang: [
        { nama: 'Toolbox Teknisi Lengkap', kondisi: 'BAIK', catatan: 'Obeng, tang, kunci pas lengkap' },
        { nama: 'Multimeter Digital', kondisi: 'BAIK', catatan: 'Kalibrasi normal, baterai aman' },
        { nama: 'Tang Ampere', kondisi: 'RUSAK', catatan: 'Layar LCD buram, sudah diajukan penggantian' },
      ],
    },
    {
      id: 'rich-bast-05',
      lama: '13003',
      baru: '13002',
      jenis: JenisSerahTerima.PERALATAN,
      dayOffset: -1,
      status: StatusSerahTerima.SELESAI,
      catatan: 'Serah terima alat inspeksi ruang panel dan genset.',
      barang: [
        { nama: 'Thermogun Infrared', kondisi: 'BAIK', catatan: 'Akurasi normal' },
        { nama: 'Kunci Ruang Panel LVMDP', kondisi: 'BAIK', catatan: 'Lengkap 1 set' },
        { nama: 'Sarung Tangan Isolasi', kondisi: 'BAIK', catatan: 'Bersih dan layak pakai' },
      ],
    },
    {
      id: 'rich-bast-06',
      lama: '11001',
      baru: '11003',
      jenis: JenisSerahTerima.PIKET,
      dayOffset: -2,
      status: StatusSerahTerima.SELESAI,
      catatan: 'Penyerahan piket berjalan tertib tanpa kendala.',
      barang: [
        { nama: 'Kunci Gerbang Utama', kondisi: 'BAIK', catatan: 'Lengkap' },
        { nama: 'Radio HT Pos Utama', kondisi: 'BAIK', catatan: 'Normal' },
      ],
    },
  ];

  for (const b of bastDefs) {
    const lama = staffMap[b.lama];
    const baru = staffMap[b.baru];
    const dateStr = addDays(today, b.dayOffset);
    const selesai = b.status === StatusSerahTerima.SELESAI;
    const ttdLama = b.jenis === JenisSerahTerima.PIKET ? sig1 : sig3;
    const ttdBaru = b.jenis === JenisSerahTerima.PIKET ? sig2 : sig4;

    let pdfUrl: string | null = null;
    if (selesai) {
      pdfUrl = await generateAndUploadBAST({
        id: b.id,
        jenis: b.jenis,
        divisi: lama.divisi,
        tanggal: makeTime(dateStr, 14, 15),
        staff_lama_nama: lama.nama,
        staff_baru_nama: baru.nama,
        barang_list: b.barang,
        catatan: b.catatan,
        ttd_lama_base64: ttdLama.base64,
        ttd_baru_base64: ttdBaru.base64,
      });
    }

    await prisma.serahTerima.upsert({
      where: { id: b.id },
      update: {
        staff_lama_id: lama.id,
        staff_baru_id: baru.id,
        jenis: b.jenis,
        shift_date: makeDateOnly(dateStr),
        barang_list: b.barang,
        catatan: b.catatan,
        foto_urls: [b.jenis === JenisSerahTerima.PIKET ? photoPatroli : photoUtility],
        ttd_lama_url: ttdLama.url,
        ttd_baru_url: selesai ? ttdBaru.url : null,
        bast_pdf_url: pdfUrl,
        status: b.status,
        created_at: makeTime(dateStr, 14, 10),
      },
      create: {
        id: b.id,
        staff_lama_id: lama.id,
        staff_baru_id: baru.id,
        jenis: b.jenis,
        shift_date: makeDateOnly(dateStr),
        barang_list: b.barang,
        catatan: b.catatan,
        foto_urls: [b.jenis === JenisSerahTerima.PIKET ? photoPatroli : photoUtility],
        ttd_lama_url: ttdLama.url,
        ttd_baru_url: selesai ? ttdBaru.url : null,
        bast_pdf_url: pdfUrl,
        status: b.status,
        created_at: makeTime(dateStr, 14, 10),
      },
    });
  }

  // 12. Pengumuman Global (5 pengumuman realistis)
  console.log('12. Menyiapkan 5 Pengumuman Global operasional...');
  const pengumumanDefs = [
    {
      id: 'rich-ann-01',
      tipe: TipePengumuman.PENTING,
      judul: 'Wajib Refresh Lokasi GPS Sebelum Absen Masuk & Keluar',
      konten: 'Seluruh petugas lapangan diimbau memastikan status Kartu Lokasi di halaman Absensi menunjukkan DALAM RADIUS KANTOR dengan akurasi maksimal 50 meter. Gunakan tombol Perbarui Lokasi apabila titik GPS belum sinkron saat tiba di area tugas.',
      dayOffset: 0,
    },
    {
      id: 'rich-ann-02',
      tipe: TipePengumuman.INFO,
      judul: 'Jadwal Simulasi Evakuasi Kebakaran & Pemeriksaan APAR',
      konten: 'Latihan evakuasi gedung dilaksanakan hari Jumat pukul 09.30 WIB. Tim Keamanan bertugas mengamankan jalur evakuasi, tim Cleaning Service membantu mengarahkan tamu di lobby, dan tim Utility memastikan seluruh panel dan pompa hidran siap siaga.',
      dayOffset: -1,
    },
    {
      id: 'rich-ann-03',
      tipe: TipePengumuman.UPDATE,
      judul: 'Aktifnya Fitur Pengingat Otomatis 1 Jam Sebelum Shift',
      konten: 'Aplikasi SIAP Mobile kini otomatis mengirimkan pengingat tepat 60 menit sebelum jam shift dimulai, baik saat online maupun offline. Pastikan izin notifikasi Android dalam kondisi aktif agar tidak terlambat absen.',
      dayOffset: -2,
    },
    {
      id: 'rich-ann-04',
      tipe: TipePengumuman.INFO,
      judul: 'Standar Dokumentasi Foto Laporan Harian & Per 3 Jam',
      konten: 'Setiap laporan harian maupun patroli per 3 jam wajib menyertakan minimal 1 foto langsung dari kamera aplikasi agar watermark waktu, nama petugas, dan koordinat GPS tercatat otomatis.',
      dayOffset: -4,
    },
    {
      id: 'rich-ann-05',
      tipe: TipePengumuman.PENTING,
      judul: 'Prosedur Pendaftaran Perangkat HP Baru di SIAP',
      konten: 'Apabila petugas mengganti perangkat Android, harap segera mendaftarkan perangkat melalui halaman Absensi dan menghubungi Koordinator atau Admin untuk persetujuan satu kali sebelum melakukan absensi.',
      dayOffset: -6,
    },
  ];
  for (const ann of pengumumanDefs) {
    await prisma.pengumuman.upsert({
      where: { id: ann.id },
      update: {
        admin_id: admin.id,
        tipe: ann.tipe,
        judul: ann.judul,
        konten: ann.konten,
        created_at: makeTime(addDays(today, ann.dayOffset), 8, 30),
      },
      create: {
        id: ann.id,
        admin_id: admin.id,
        tipe: ann.tipe,
        judul: ann.judul,
        konten: ann.konten,
        created_at: makeTime(addDays(today, ann.dayOffset), 8, 30),
      },
    });
  }

  // 13. Attendance Archive for previous month (2026-10)
  console.log('13. Menyiapkan Arsip Kehadiran Bulanan (2026-10)...');
  await prisma.attendanceArchive.upsert({
    where: { month_revision: { month: '2026-10', revision: 1 } },
    update: {
      status: 'FINAL',
      reason: 'Finalisasi rekap kehadiran operasional bulan Oktober 2026',
      actor_id: admin.id,
      rows: [
        { nik: '11001', nama: 'Budi Santoso', divisi: 'KEAMANAN', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
        { nik: '12001', nama: 'Dewi Rahayu', divisi: 'CLEANING_SERVICE', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
        { nik: '13001', nama: 'Hendra Wijaya', divisi: 'UTILITY', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
      ],
    },
    create: {
      month: '2026-10',
      revision: 1,
      status: 'FINAL',
      reason: 'Finalisasi rekap kehadiran operasional bulan Oktober 2026',
      actor_id: admin.id,
      rows: [
        { nik: '11001', nama: 'Budi Santoso', divisi: 'KEAMANAN', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
        { nik: '12001', nama: 'Dewi Rahayu', divisi: 'CLEANING_SERVICE', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
        { nik: '13001', nama: 'Hendra Wijaya', divisi: 'UTILITY', date: '2026-10-31', status: 'HADIR', jam_aktual: 8.0 },
      ],
    },
  });

  console.log('\nRich seeding SIAP selesai! Ringkasan:');
  console.log('- 5 Area Tugas, 16 Staff (1 Admin + 5 Keamanan + 5 Cleaning Service + 5 Utility)');
  console.log('- 14 hari penuh ShiftInstance & Absensi + 2 Bukti Offline Pending');
  console.log('- 13 Laporan Harian + 12 Laporan Per 3 Jam Satpam');
  console.log('- 9 Pengajuan Izin/Cuti/Sakit + Kuota Cuti Tahunan');
  console.log('- 6 Dokumen Serah Terima (BAST) + Inventaris Bermasalah');
  console.log('- 5 Pengumuman Global + 1 Arsip Bulanan 2026-10');
}

main()
  .catch((e) => {
    console.error('Error rich seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
