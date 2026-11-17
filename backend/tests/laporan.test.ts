import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('Laporan Harian & Per-Jam API Tests', () => {
  const testPassword = 'password123';
  let csStaffId = '';
  let satpamStaffId = '';
  let csToken = '';
  let satpamToken = '';
  let jpegBuffer: Buffer;

  beforeAll(async () => {
    jpegBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 10, g: 120, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    await prisma.laporanPerJam.deleteMany({ where: { staff: { nik: { in: ['TEST-LAP-CS', 'TEST-LAP-SATPAM'] } } } });
    await prisma.laporan.deleteMany({ where: { staff: { nik: { in: ['TEST-LAP-CS', 'TEST-LAP-SATPAM'] } } } });
    await prisma.staff.deleteMany({ where: { nik: { in: ['TEST-LAP-CS', 'TEST-LAP-SATPAM'] } } });

    const password_hash = await bcrypt.hash(testPassword, 10);
    const cs = await prisma.staff.create({
      data: {
        nik: 'TEST-LAP-CS',
        nama: 'Test CS Laporan',
        password_hash,
        divisi: 'CLEANING_SERVICE',
        role: 'CS',
        aktif: true,
      },
    });
    csStaffId = cs.id;

    const satpam = await prisma.staff.create({
      data: {
        nik: 'TEST-LAP-SATPAM',
        nama: 'Test Satpam Laporan',
        password_hash,
        divisi: 'KEAMANAN',
        role: 'SATPAM',
        aktif: true,
      },
    });
    satpamStaffId = satpam.id;

    const csLogin = await request(app).post('/auth/login').send({
      nik: 'TEST-LAP-CS',
      password: testPassword,
    });
    csToken = csLogin.body.data.token;

    const satpamLogin = await request(app).post('/auth/login').send({
      nik: 'TEST-LAP-SATPAM',
      password: testPassword,
    });
    satpamToken = satpamLogin.body.data.token;
  });

  afterAll(async () => {
    await prisma.laporanPerJam.deleteMany({ where: { staff_id: { in: [csStaffId, satpamStaffId] } } });
    await prisma.absensi.deleteMany({ where: { staff_id: { in: [csStaffId, satpamStaffId] } } });
    await prisma.laporan.deleteMany({ where: { staff_id: { in: [csStaffId, satpamStaffId] } } });
    await prisma.staff.deleteMany({ where: { id: { in: [csStaffId, satpamStaffId] } } });
  });

  it('POST /laporan ditolak jika CS mengirim kategori milik divisi KEAMANAN', async () => {
    const res = await request(app)
      .post('/laporan')
      .set('Authorization', `Bearer ${csToken}`)
      .field('kategori', 'PATROLI')
      .field('judul', 'Patroli Tidak Valid Untuk CS')
      .field('deskripsi', 'Deskripsi cukup panjang untuk lolos validasi panjang minimal.');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('tidak valid');
  });

  it('POST /laporan berhasil untuk kategori sesuai divisi + foto multipart', async () => {
    const res = await request(app)
      .post('/laporan')
      .set('Authorization', `Bearer ${csToken}`)
      .field('kategori', 'PEMBERSIHAN_AREA')
      .field('judul', 'Pembersihan Area Lobby Utama')
      .field('deskripsi', 'Pembersihan lantai lobby utama dan meja resepsionis telah selesai dilakukan.')
      .attach('foto', jpegBuffer, { filename: 'bukti.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kategori).toBe('PEMBERSIHAN_AREA');
    expect(Array.isArray(res.body.data.foto_urls)).toBe(true);
  });

  it('POST /laporan/perjam khusus SATPAM menolak CS (403), butuh shift aktif, dan menolak duplikasi jam', async () => {
    const csForbidden = await request(app)
      .post('/laporan/perjam')
      .set('Authorization', `Bearer ${csToken}`)
      .field('jam', '9')
      .field('status_keamanan', 'AMAN')
      .field('lat', '-6.2')
      .field('lng', '106.8');
    expect(csForbidden.statusCode).toBe(403);

    // Before check-in -> rejected 400
    const beforeShiftRes = await request(app)
      .post('/laporan/perjam')
      .set('Authorization', `Bearer ${satpamToken}`)
      .field('jam', '9')
      .field('status_keamanan', 'AMAN')
      .field('lat', '-6.2')
      .field('lng', '106.8')
      .attach('foto', jpegBuffer, { filename: 'patroli9.jpg', contentType: 'image/jpeg' });
    expect(beforeShiftRes.statusCode).toBe(400);

    // Activate shift via MASUK attendance record
    await prisma.absensi.create({
      data: {
        staff_id: satpamStaffId,
        jenis: 'MASUK',
        lat: -6.2,
        lng: 106.8,
      },
    });

    const firstRes = await request(app)
      .post('/laporan/perjam')
      .set('Authorization', `Bearer ${satpamToken}`)
      .field('jam', '9')
      .field('status_keamanan', 'AMAN')
      .field('catatan', 'Pos utama aman terkendali.')
      .field('lat', '-6.2')
      .field('lng', '106.8')
      .attach('foto', jpegBuffer, { filename: 'patroli9.jpg', contentType: 'image/jpeg' });

    expect(firstRes.statusCode).toBe(201);
    expect(firstRes.body.success).toBe(true);

    const dupRes = await request(app)
      .post('/laporan/perjam')
      .set('Authorization', `Bearer ${satpamToken}`)
      .field('jam', '9')
      .field('status_keamanan', 'AMAN')
      .field('lat', '-6.2')
      .field('lng', '106.8')
      .attach('foto', jpegBuffer, { filename: 'patroli9b.jpg', contentType: 'image/jpeg' });

    expect(dupRes.statusCode).toBe(400);
  });
});
