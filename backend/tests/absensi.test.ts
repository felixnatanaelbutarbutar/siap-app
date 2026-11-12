import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { mockStorageObjects } from './setup';

describe('Absensi & GPS API Tests', () => {
  const testPassword = 'password123';
  let areaId = '';
  let staffId = '';
  let token = '';
  let jpegBuffer: Buffer;

  beforeAll(async () => {
    jpegBuffer = await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 3,
        background: { r: 30, g: 215, b: 96 },
      },
    })
      .jpeg()
      .toBuffer();

    await prisma.absensi.deleteMany({ where: { staff: { nik: 'TEST-ABS-001' } } });
    await prisma.staff.deleteMany({ where: { nik: 'TEST-ABS-001' } });
    await prisma.areaTugas.deleteMany({ where: { nama: 'Test Area Absensi' } });

    const area = await prisma.areaTugas.create({
      data: {
        nama: 'Test Area Absensi',
        lat: -6.2,
        lng: 106.816666,
        radius_meter: 100,
        aktif: true,
      },
    });
    areaId = area.id;

    const password_hash = await bcrypt.hash(testPassword, 10);
    const staff = await prisma.staff.create({
      data: {
        nik: 'TEST-ABS-001',
        nama: 'Test Satpam <Absensi>',
        password_hash,
        divisi: 'KEAMANAN',
        role: 'SATPAM',
        area_tugas_id: areaId,
        aktif: true,
      },
    });
    staffId = staff.id;

    const loginRes = await request(app).post('/auth/login').send({
      nik: 'TEST-ABS-001',
      password: testPassword,
    });
    token = loginRes.body.data.token;
  });

  afterAll(async () => {
    await prisma.absensi.deleteMany({ where: { staff_id: staffId } });
    await prisma.staff.deleteMany({ where: { id: staffId } });
    await prisma.areaTugas.deleteMany({ where: { id: areaId } });
  });

  it('POST /absensi/masuk ditolak jika foto tidak disertakan', async () => {
    const res = await request(app)
      .post('/absensi/masuk')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: -6.2, lng: 106.816666, akurasi_gps: 10 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /absensi/masuk ditolak jika akurasi GPS > 50 meter', async () => {
    const res = await request(app)
      .post('/absensi/masuk')
      .set('Authorization', `Bearer ${token}`)
      .field('lat', '-6.2')
      .field('lng', '106.816666')
      .field('akurasi_gps', '75')
      .attach('foto', jpegBuffer, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('GPS_VALIDATION_FAILED');
  });

  it('POST /absensi/masuk ditolak jika GPS di luar radius area tugas', async () => {
    const res = await request(app)
      .post('/absensi/masuk')
      .set('Authorization', `Bearer ${token}`)
      .field('lat', '-6.1')
      .field('lng', '106.8')
      .field('akurasi_gps', '12')
      .attach('foto', jpegBuffer, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('GPS_VALIDATION_FAILED');
    expect(res.body.message).toContain('luar area tugas');
  });

  it('POST /absensi/masuk -> istirahat -> keluar berhasil penuh dengan watermark + upload', async () => {
    const masukRes = await request(app)
      .post('/absensi/masuk')
      .set('Authorization', `Bearer ${token}`)
      .field('lat', '-6.2')
      .field('lng', '106.816666')
      .field('akurasi_gps', '8')
      .attach('foto', jpegBuffer, { filename: 'masuk.jpg', contentType: 'image/jpeg' });

    expect(masukRes.statusCode).toBe(200);
    expect(masukRes.body.success).toBe(true);
    expect(masukRes.body.data.jenis).toBe('MASUK');
    expect(mockStorageObjects.size).toBeGreaterThan(0);

    // Duplicate MASUK rejected
    const dupMasukRes = await request(app)
      .post('/absensi/masuk')
      .set('Authorization', `Bearer ${token}`)
      .field('lat', '-6.2')
      .field('lng', '106.816666')
      .field('akurasi_gps', '8')
      .attach('foto', jpegBuffer, { filename: 'dup.jpg', contentType: 'image/jpeg' });
    expect(dupMasukRes.statusCode).toBe(400);

    const startBreakRes = await request(app)
      .post('/absensi/mulai-istirahat')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: -6.2, lng: 106.816666 });
    expect(startBreakRes.statusCode).toBe(200);

    const endBreakRes = await request(app)
      .post('/absensi/selesai-istirahat')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: -6.2, lng: 106.816666 });
    expect(endBreakRes.statusCode).toBe(200);

    const keluarRes = await request(app)
      .post('/absensi/keluar')
      .set('Authorization', `Bearer ${token}`)
      .field('lat', '-6.2')
      .field('lng', '106.816666')
      .field('akurasi_gps', '10')
      .attach('foto', jpegBuffer, { filename: 'keluar.jpg', contentType: 'image/jpeg' });

    expect(keluarRes.statusCode).toBe(200);
    expect(keluarRes.body.data.jenis).toBe('KELUAR');
  });
});
