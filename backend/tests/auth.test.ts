import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('Auth & RBAC API Tests', () => {
  const testPassword = 'password123';
  let activeStaffId = '';
  let inactiveStaffId = '';
  let activeToken = '';
  let revokedJti = '';

  beforeAll(async () => {
    await prisma.staff.deleteMany({
      where: { nik: { in: ['TEST-AUTH-001', 'TEST-AUTH-002'] } },
    });

    const password_hash = await bcrypt.hash(testPassword, 10);

    const activeStaff = await prisma.staff.create({
      data: {
        nik: 'TEST-AUTH-001',
        nama: 'Test Satpam Auth',
        password_hash,
        divisi: 'KEAMANAN',
        role: 'SATPAM',
        aktif: true,
      },
    });
    activeStaffId = activeStaff.id;

    const inactiveStaff = await prisma.staff.create({
      data: {
        nik: 'TEST-AUTH-002',
        nama: 'Test Satpam Nonaktif',
        password_hash,
        divisi: 'KEAMANAN',
        role: 'SATPAM',
        aktif: false,
      },
    });
    inactiveStaffId = inactiveStaff.id;
  });

  afterAll(async () => {
    if (revokedJti) {
      await prisma.revokedToken.deleteMany({ where: { token_jti: revokedJti } });
    }
    await prisma.staff.deleteMany({
      where: { id: { in: [activeStaffId, inactiveStaffId].filter(Boolean) } },
    });
  });

  it('POST /auth/login berhasil dengan NIK dan password valid', async () => {
    const res = await request(app).post('/auth/login').send({
      nik: 'TEST-AUTH-001',
      password: testPassword,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.nik).toBe('TEST-AUTH-001');
    activeToken = res.body.data.token;
    const decoded = jwt.decode(activeToken) as { jti: string } | null;
    revokedJti = decoded?.jti || '';
  });

  it('POST /auth/login gagal 401 dengan password salah', async () => {
    const res = await request(app).post('/auth/login').send({
      nik: 'TEST-AUTH-001',
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/login ditolak 403 untuk akun nonaktif', async () => {
    const res = await request(app).post('/auth/login').send({
      nik: 'TEST-AUTH-002',
      password: testPassword,
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_INACTIVE');
  });

  it('GET /auth/me mengembalikan profil user terautentikasi dan RBAC menolak /admin/staff untuk SATPAM', async () => {
    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.data.nik).toBe('TEST-AUTH-001');

    const adminRes = await request(app)
      .get('/admin/staff')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(adminRes.statusCode).toBe(403);
  });

  it('POST /auth/logout mem-blacklist jti dan token lama ditolak pada request berikutnya', async () => {
    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const revoked = await prisma.revokedToken.findUnique({
      where: { token_jti: revokedJti },
    });
    expect(revoked).not.toBeNull();

    const retryMe = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${activeToken}`);
    expect(retryMe.statusCode).toBe(401);
    expect(retryMe.body.code).toBe('TOKEN_REVOKED');
  });
});
