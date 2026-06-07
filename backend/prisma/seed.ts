import { PrismaClient, Role, Divisi } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database SIAP...\n');

  // ─── 1. Buat Area Tugas ────────────────────────────────────────────────────
  console.log('📍 Membuat area tugas...');

  const areaKantor = await prisma.areaTugas.upsert({
    where: { id: 'area-kantor-pusat' },
    update: { radius_meter: 50000 },
    create: {
      id: 'area-kantor-pusat',
      nama: 'Kantor Pusat',
      lat: -6.2088,
      lng: 106.8456,
      radius_meter: 50000, // 50km untuk development
      aktif: true,
    },
  });

  const areaGudang = await prisma.areaTugas.upsert({
    where: { id: 'area-gudang-utama' },
    update: { radius_meter: 50000 },
    create: {
      id: 'area-gudang-utama',
      nama: 'Gudang Utama',
      lat: -6.2150,
      lng: 106.8500,
      radius_meter: 50000, // 50km untuk development
      aktif: true,
    },
  });

  const areaLobby = await prisma.areaTugas.upsert({
    where: { id: 'area-lobby-utama' },
    update: { radius_meter: 50000 },
    create: {
      id: 'area-lobby-utama',
      nama: 'Lobby Utama',
      lat: -6.2080,
      lng: 106.8440,
      radius_meter: 50000, // 50km untuk development
      aktif: true,
    },
  });

  console.log(`  ✅ Area: ${areaKantor.nama}`);
  console.log(`  ✅ Area: ${areaGudang.nama}`);
  console.log(`  ✅ Area: ${areaLobby.nama}`);

  // ─── 2. Hash passwords ───────────────────────────────────────────────────
  const adminPassword  = await bcrypt.hash('admin123', 12);
  const staffPassword  = await bcrypt.hash('staff123', 12);

  // ─── 3. Buat Admin ────────────────────────────────────────────────────────
  console.log('\n👤 Membuat akun admin...');

  const admin = await prisma.staff.upsert({
    where: { nik: '00001' },
    update: {},
    create: {
      nik: '00001',
      nama: 'Administrator SIAP',
      password_hash: adminPassword,
      role: Role.ADMIN,
      divisi: Divisi.MANAJEMEN,
      area_tugas_id: null,
      aktif: true,
    },
  });
  console.log(`  ✅ ADMIN: ${admin.nama} (NIK: ${admin.nik}, Password: admin123)`);

  // ─── 4. Buat Satpam (Divisi KEAMANAN) ────────────────────────────────────
  console.log('\n👮 Membuat akun satpam (Keamanan)...');

  const satpamData = [
    { nik: '11001', nama: 'Budi Santoso',  area_tugas_id: areaKantor.id },
    { nik: '11002', nama: 'Agus Prasetyo', area_tugas_id: areaGudang.id },
  ];

  for (const data of satpamData) {
    const s = await prisma.staff.upsert({
      where: { nik: data.nik },
      update: {},
      create: {
        nik: data.nik,
        nama: data.nama,
        password_hash: staffPassword,
        role: Role.SATPAM,
        divisi: Divisi.KEAMANAN,
        area_tugas_id: data.area_tugas_id,
        aktif: true,
      },
    });
    console.log(`  ✅ SATPAM: ${s.nama} (NIK: ${s.nik})`);
  }

  // ─── 5. Buat CS (Divisi CUSTOMER_SERVICE) ────────────────────────────────
  console.log('\n🎧 Membuat akun CS (Customer Service)...');

  const csData = [
    { nik: '12001', nama: 'Dewi Rahayu',    area_tugas_id: areaLobby.id },
    { nik: '12002', nama: 'Sari Wulandari', area_tugas_id: areaKantor.id },
  ];

  for (const data of csData) {
    const s = await prisma.staff.upsert({
      where: { nik: data.nik },
      update: {},
      create: {
        nik: data.nik,
        nama: data.nama,
        password_hash: staffPassword,
        role: Role.CS,
        divisi: Divisi.CUSTOMER_SERVICE,
        area_tugas_id: data.area_tugas_id,
        aktif: true,
      },
    });
    console.log(`  ✅ CS: ${s.nama} (NIK: ${s.nik})`);
  }

  // ─── 6. Buat Utility ─────────────────────────────────────────────────────
  console.log('\n🔧 Membuat akun utility...');

  const utilityData = [
    { nik: '13001', nama: 'Hendra Wijaya', area_tugas_id: areaKantor.id },
    { nik: '13002', nama: 'Rudi Hartono',  area_tugas_id: areaGudang.id },
  ];

  for (const data of utilityData) {
    const s = await prisma.staff.upsert({
      where: { nik: data.nik },
      update: {},
      create: {
        nik: data.nik,
        nama: data.nama,
        password_hash: staffPassword,
        role: Role.UTILITY,
        divisi: Divisi.UTILITY,
        area_tugas_id: data.area_tugas_id,
        aktif: true,
      },
    });
    console.log(`  ✅ UTILITY: ${s.nama} (NIK: ${s.nik})`);
  }

  // ─── Ringkasan ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Seeding selesai!');
  console.log('\n📋 Akun untuk testing:');
  console.log('  ─── Admin ───────────────────────────────────');
  console.log('  NIK: 00001  | Password: admin123  | Role: ADMIN');
  console.log('  ─── Satpam (Keamanan) ───────────────────────');
  console.log('  NIK: 11001  | Password: staff123  | Role: SATPAM');
  console.log('  NIK: 11002  | Password: staff123  | Role: SATPAM');
  console.log('  ─── Customer Service ────────────────────────');
  console.log('  NIK: 12001  | Password: staff123  | Role: CS');
  console.log('  NIK: 12002  | Password: staff123  | Role: CS');
  console.log('  ─── Utility ─────────────────────────────────');
  console.log('  NIK: 13001  | Password: staff123  | Role: UTILITY');
  console.log('  NIK: 13002  | Password: staff123  | Role: UTILITY');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error saat seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
