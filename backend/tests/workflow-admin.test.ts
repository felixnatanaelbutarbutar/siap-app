import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('Admin, Izin, Serah Terima & Security Integration Tests', () => {
  const testPassword = 'password123';
  let adminId = '';
  let satpamLamaId = '';
  let satpamBaruId = '';
  let csId = '';
  let areaId = '';

  let adminToken = '';
  let satpamLamaToken = '';
  let satpamBaruToken = '';
  let csToken = '';

  let ttdBase64 = '';
  let createdStaffId = '';
  let serahTerimaId = '';
  let izinId = '';
  let jadwalId = '';
  let pengumumanId = '';

  beforeAll(async () => {
    const pngBuffer = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    ttdBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    await prisma.izinCuti.deleteMany({
      where: { staff: { nik: { in: ['TEST-WF-ADMIN', 'TEST-WF-SAT1', 'TEST-WF-SAT2', 'TEST-WF-CS', 'TEST-WF-NEW'] } } },
    });
    await prisma.serahTerima.deleteMany({
      where: { staff_lama: { nik: { in: ['TEST-WF-SAT1', 'TEST-WF-SAT2'] } } },
    });
    await prisma.jadwalKerja.deleteMany({
      where: { staff: { nik: { in: ['TEST-WF-SAT1', 'TEST-WF-SAT2', 'TEST-WF-NEW'] } } },
    });
    await prisma.pengumuman.deleteMany({ where: { admin: { nik: 'TEST-WF-ADMIN' } } });
    await prisma.staff.deleteMany({
      where: { nik: { in: ['TEST-WF-ADMIN', 'TEST-WF-SAT1', 'TEST-WF-SAT2', 'TEST-WF-CS', 'TEST-WF-NEW'] } },
    });
    await prisma.areaTugas.deleteMany({ where: { nama: 'Test Area Workflow' } });

    const area = await prisma.areaTugas.create({
      data: { nama: 'Test Area Workflow', lat: -6.2, lng: 106.8, radius_meter: 150 },
    });
    areaId = area.id;

    const password_hash = await bcrypt.hash(testPassword, 10);
    const admin = await prisma.staff.create({
      data: {
        nik: 'TEST-WF-ADMIN',
        nama: 'Admin Workflow',
        password_hash,
        role: 'ADMIN',
        divisi: 'MANAJEMEN',
        aktif: true,
      },
    });
    adminId = admin.id;

    const sat1 = await prisma.staff.create({
      data: {
        nik: 'TEST-WF-SAT1',
        nama: 'Satpam Penyerah',
        password_hash,
        role: 'SATPAM',
        divisi: 'KEAMANAN',
        area_tugas_id: areaId,
        aktif: true,
      },
    });
    satpamLamaId = sat1.id;

    const sat2 = await prisma.staff.create({
      data: {
        nik: 'TEST-WF-SAT2',
        nama: 'Satpam Penerima',
        password_hash,
        role: 'SATPAM',
        divisi: 'KEAMANAN',
        area_tugas_id: areaId,
        aktif: true,
      },
    });
    satpamBaruId = sat2.id;

    const cs = await prisma.staff.create({
      data: {
        nik: 'TEST-WF-CS',
        nama: 'CS Bystander',
        password_hash,
        role: 'CS',
        divisi: 'CLEANING_SERVICE',
        area_tugas_id: areaId,
        aktif: true,
      },
    });
    csId = cs.id;

    adminToken = (await request(app).post('/auth/login').send({ nik: 'TEST-WF-ADMIN', password: testPassword })).body.data.token;
    satpamLamaToken = (await request(app).post('/auth/login').send({ nik: 'TEST-WF-SAT1', password: testPassword })).body.data.token;
    satpamBaruToken = (await request(app).post('/auth/login').send({ nik: 'TEST-WF-SAT2', password: testPassword })).body.data.token;
    csToken = (await request(app).post('/auth/login').send({ nik: 'TEST-WF-CS', password: testPassword })).body.data.token;
  });

  afterAll(async () => {
    if (izinId) await prisma.izinCuti.deleteMany({ where: { id: izinId } });
    if (serahTerimaId) await prisma.serahTerima.deleteMany({ where: { id: serahTerimaId } });
    if (jadwalId) await prisma.jadwalKerja.deleteMany({ where: { id: jadwalId } });
    if (pengumumanId) await prisma.pengumuman.deleteMany({ where: { id: pengumumanId } });
    await prisma.staff.deleteMany({
      where: { id: { in: [adminId, satpamLamaId, satpamBaruId, csId, createdStaffId].filter(Boolean) } },
    });
    if (areaId) await prisma.areaTugas.deleteMany({ where: { id: areaId } });
  });

  it('Admin staff validation menolak pasangan role-divisi tidak valid dan menerima pasangan valid', async () => {
    const invalidRes = await request(app)
      .post('/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nik: 'TEST-WF-NEW',
        nama: 'Invalid Pair',
        password: testPassword,
        role: 'SATPAM',
        divisi: 'UTILITY',
      });
    expect(invalidRes.statusCode).toBe(400);

    const validRes = await request(app)
      .post('/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nik: 'TEST-WF-NEW',
        nama: 'Valid Pair Utility',
        password: testPassword,
        role: 'UTILITY',
        divisi: 'UTILITY',
        area_tugas_id: areaId,
      });
    expect(validRes.statusCode).toBe(201);
    createdStaffId = validRes.body.data.id;
  });

  it('Izin workflow menolak file non-image dan mendukung create + admin review tanpa global.prisma', async () => {
    const badMime = await request(app)
      .post('/izin')
      .set('Authorization', `Bearer ${satpamLamaToken}`)
      .field('jenis', 'IZIN')
      .field('tanggal_mulai', '2026-12-01')
      .field('tanggal_selesai', '2026-12-02')
      .field('keterangan', 'Keperluan keluarga mendadak')
      .attach('foto', Buffer.from('not-an-image'), { filename: 'script.txt', contentType: 'text/plain' });
    expect(badMime.statusCode).toBe(400);

    const createRes = await request(app)
      .post('/izin')
      .set('Authorization', `Bearer ${satpamLamaToken}`)
      .send({
        jenis: 'CUTI',
        tanggal_mulai: '2026-12-05',
        tanggal_selesai: '2026-12-06',
        keterangan: 'Cuti tahunan terencana',
      });
    expect(createRes.statusCode).toBe(201);
    izinId = createRes.body.data.id;

    const listAdminRes = await request(app)
      .get('/admin/izin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listAdminRes.statusCode).toBe(200);
    expect(listAdminRes.body.data.some((i: any) => i.id === izinId)).toBe(true);

    const reviewRes = await request(app)
      .put(`/admin/izin/${izinId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', komentar_admin: 'Disetujui untuk test' });
    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');
  });

  it('Serah terima mulai -> konfirmasi mengunduh ttd_lama, generate BAST, dan BAST menegakkan IDOR ownership', async () => {
    const startRes = await request(app)
      .post('/serah-terima/mulai')
      .set('Authorization', `Bearer ${satpamLamaToken}`)
      .send({
        jenis: 'PIKET',
        staff_baru_id: satpamBaruId,
        barang_list: [{ nama: 'HT Motorola', kondisi: 'BAIK', catatan: 'Lengkap' }],
        catatan: 'Serah terima shift test',
        ttd_lama: ttdBase64,
      });

    expect(startRes.statusCode).toBe(201);
    serahTerimaId = startRes.body.data.id;

    const confirmRes = await request(app)
      .post(`/serah-terima/${serahTerimaId}/konfirmasi`)
      .set('Authorization', `Bearer ${satpamBaruToken}`)
      .send({ ttd_baru: ttdBase64 });

    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.data.status).toBe('SELESAI');
    expect(confirmRes.body.data.bast_pdf_url).toContain('bast/');

    // Unrelated CS user -> 403
    const bystanderBast = await request(app)
      .get(`/serah-terima/${serahTerimaId}/bast`)
      .set('Authorization', `Bearer ${csToken}`);
    expect(bystanderBast.statusCode).toBe(403);

    // Participant / Admin -> 302 redirect ke URL BAST
    const ownerBast = await request(app)
      .get(`/serah-terima/${serahTerimaId}/bast`)
      .set('Authorization', `Bearer ${satpamLamaToken}`);
    expect(ownerBast.statusCode).toBe(302);
  });

  it('Jadwal, Pengumuman, dan Statistik Kehadiran mengembalikan data real tervalidasi', async () => {
    const jadwalRes = await request(app)
      .post('/admin/jadwal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        staff_id: satpamLamaId,
        hari: 'SENIN',
        jam_masuk: '07:00',
        jam_keluar: '19:00',
      });
    expect(jadwalRes.statusCode).toBe(201);
    jadwalId = jadwalRes.body.data.id;

    const pengumumanRes = await request(app)
      .post('/pengumuman')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        judul: 'Pengumuman Test Integrasi',
        konten: 'Isi pengumuman untuk memastikan validasi dan persisten DB berjalan.',
        tipe: 'PENTING',
      });
    expect(pengumumanRes.statusCode).toBe(201);
    pengumumanId = pengumumanRes.body.data.id;

    const statRes = await request(app)
      .get('/admin/statistik/kehadiran')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ bulan: new Date().getMonth() + 1, tahun: new Date().getFullYear() });

    expect(statRes.statusCode).toBe(200);
    expect(Array.isArray(statRes.body.data)).toBe(true);
    expect(Array.isArray(statRes.body.chart)).toBe(true);
    expect(statRes.body.chart.length).toBeGreaterThan(0);
    expect(typeof statRes.body.data[0].total_hadir).toBe('number');
  });
});
