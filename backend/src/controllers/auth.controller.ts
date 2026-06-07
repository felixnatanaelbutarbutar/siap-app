import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { loginSchema, fcmTokenSchema } from '../schemas/auth.schema';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth.middleware';
import { uploadFile } from '../services/storage.service';

// ─── POST /auth/login ─────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validasi input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.errors[0].message,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.errors,
      });
      return;
    }

    const { nik, password } = parsed.data;

    // Cari staff berdasarkan NIK
    const staff = await prisma.staff.findUnique({
      where: { nik },
      include: { area_tugas: { select: { id: true, nama: true } } },
    });

    if (!staff) {
      res.status(401).json({
        success: false,
        message: 'NIK atau password salah.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Cek akun aktif
    if (!staff.aktif) {
      res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
      return;
    }

    // Verifikasi password
    const passwordValid = await bcrypt.compare(password, staff.password_hash);
    if (!passwordValid) {
      res.status(401).json({
        success: false,
        message: 'NIK atau password salah.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Generate JWT
    const jti = uuidv4();
    const secret = process.env.JWT_SECRET!;
    const expiresIn = (process.env.JWT_EXPIRES_IN || '12h') as string;

    const payload: JwtPayload = {
      jti,
      id: staff.id,
      nik: staff.nik,
      nama: staff.nama,
      role: staff.role,
      divisi: staff.divisi,
    };

    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    logger.info(`Login sukses: ${staff.nama} (NIK: ${staff.nik}, Role: ${staff.role})`);

    res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id: staff.id,
          nik: staff.nik,
          nama: staff.nama,
          role: staff.role,
          divisi: staff.divisi,
          foto_profil: staff.foto_profil,
          area_tugas: staff.area_tugas,
          fcm_token: staff.fcm_token,
        },
      },
    });
  } catch (error) {
    logger.error('Error pada login:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server. Silakan coba lagi.',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // Hitung expired_at dari JWT exp
    const expiredAt = user.exp
      ? new Date(user.exp * 1000)
      : new Date(Date.now() + 12 * 60 * 60 * 1000); // fallback 12 jam

    // Simpan JTI ke blacklist
    await prisma.revokedToken.create({
      data: {
        token_jti: user.jti,
        expired_at: expiredAt,
      },
    });

    // Bersihkan FCM token agar tidak terima push notif setelah logout
    await prisma.staff.update({
      where: { id: user.id },
      data: { fcm_token: null },
    });

    logger.info(`Logout: ${user.nama} (NIK: ${user.nik})`);

    res.status(200).json({
      success: true,
      message: 'Logout berhasil.',
    });
  } catch (error) {
    logger.error('Error pada logout:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ─── POST /auth/fcm-token ─────────────────────────────────────────────────────
export const updateFcmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const parsed = fcmTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.errors[0].message,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    await prisma.staff.update({
      where: { id: user.id },
      data: { fcm_token: parsed.data.fcm_token },
    });

    res.status(200).json({
      success: true,
      message: 'FCM token berhasil diperbarui.',
    });
  } catch (error) {
    logger.error('Error update FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nik: true,
        nama: true,
        role: true,
        divisi: true,
        foto_profil: true,
        aktif: true,
        created_at: true,
        area_tugas: {
          select: { id: true, nama: true, lat: true, lng: true, radius_meter: true },
        },
      },
    });

    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Data staff tidak ditemukan.',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    logger.error('Error getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      code: 'INTERNAL_ERROR',
    });
  }
};

// ─── PUT /auth/profil/foto ────────────────────────────────────────────────────
export const uploadFotoProfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'File foto wajib disertakan.' });
      return;
    }

    // Upload ke MinIO
    const filename = `profil/${user.id}/${Date.now()}_profil.jpg`;
    const fotoUrl = await uploadFile(file.buffer, filename, file.mimetype);

    // Update database
    await prisma.staff.update({
      where: { id: user.id },
      data: { foto_profil: fotoUrl },
    });

    logger.info(`Foto profil diperbarui: ${user.nama} (NIK: ${user.nik})`);

    res.status(200).json({
      success: true,
      message: 'Foto profil berhasil diperbarui.',
      data: { foto_profil: fotoUrl },
    });
  } catch (error) {
    logger.error('Error uploadFotoProfil:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server.',
      code: 'INTERNAL_ERROR',
    });
  }
};
