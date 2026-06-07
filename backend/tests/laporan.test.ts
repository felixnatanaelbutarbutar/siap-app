import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

describe('Laporan API Tests', () => {
  const testStaff = {
    nik: 'TEST-LAP-001',
    nama: 'Test CS',
    password: 'password123',
    divisi: 'CUSTOMER_SERVICE' as const,
    role: 'CS' as const,
    area_tugas: 'Lobby',
    aktif: true
  };

  let token: string;
  let staffId: number;

  beforeAll(async () => {
    await prisma.laporanHarian.deleteMany({ where: { staff: { nik: testStaff.nik } } });
    await prisma.staff.deleteMany({ where: { nik: testStaff.nik } });
    
    const hashedPassword = await bcrypt.hash(testStaff.password, 10);
    const staff = await prisma.staff.create({
      data: { ...testStaff, password: hashedPassword }
    });
    staffId = staff.id;

    const res = await request(app).post('/auth/login').send({
      nik: testStaff.nik,
      password: testStaff.password
    });
    token = res.body.data.token;
  });

  afterAll(async () => {
    await prisma.laporanHarian.deleteMany({ where: { staff_id: staffId } });
    await prisma.staff.deleteMany({ where: { id: staffId } });
  });

  it('Harus ditolak jika CS mengirim laporan kategori SATPAM', async () => {
    const res = await request(app)
      .post('/laporan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kategori: 'Keamanan_Area', // Kategori Satpam
        deskripsi: 'Ada maling',
        foto_base64: 'data:image/jpeg;base64,mockbase64'
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('tidak diizinkan');
  });
});
