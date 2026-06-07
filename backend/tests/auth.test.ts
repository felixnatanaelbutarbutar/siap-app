import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

describe('Auth API Tests', () => {
  const testStaff = {
    nik: 'TEST-AUTH-001',
    nama: 'Test User',
    password: 'password123',
    divisi: 'KEAMANAN' as const,
    role: 'SATPAM' as const,
    area_tugas: 'Pos 1',
    aktif: true
  };

  let token: string;

  beforeAll(async () => {
    // Buat data staff untuk test
    await prisma.staff.deleteMany({ where: { nik: testStaff.nik } });
    const hashedPassword = await bcrypt.hash(testStaff.password, 10);
    await prisma.staff.create({
      data: { ...testStaff, password: hashedPassword }
    });
  });

  afterAll(async () => {
    // Bersihkan data
    await prisma.staff.deleteMany({ where: { nik: testStaff.nik } });
  });

  it('Harus berhasil login dengan kredensial yang benar', async () => {
    const res = await request(app).post('/auth/login').send({
      nik: testStaff.nik,
      password: testStaff.password
    });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  it('Harus gagal login dengan password salah', async () => {
    const res = await request(app).post('/auth/login').send({
      nik: testStaff.nik,
      password: 'wrongpassword'
    });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('Harus berhasil logout dan mem-blacklist token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Cek apakah token ada di revokedToken table
    const isRevoked = await prisma.revokedToken.findUnique({
      where: { token }
    });
    expect(isRevoked).not.toBeNull();
  });
});
