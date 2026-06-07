import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// ─── Type augmentation ────────────────────────────────────────────────────────
export interface JwtPayload {
  jti: string;
  id: string;
  nik: string;
  nama: string;
  role: string;
  divisi: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── authenticate middleware ──────────────────────────────────────────────────
/**
 * Verifikasi JWT dari header Authorization: Bearer <token>
 * Cek apakah token sudah di-blacklist di tabel revoked_tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Silakan login terlebih dahulu.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      logger.error('JWT_SECRET tidak dikonfigurasi!');
      res.status(500).json({
        success: false,
        message: 'Konfigurasi server error.',
        code: 'INTERNAL_ERROR',
      });
      return;
    }

    // Verifikasi signature & expiry
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Sesi telah habis. Silakan login kembali.',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: 'Token tidak valid.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Cek apakah token sudah di-blacklist (logout)
    if (decoded.jti) {
      const revoked = await prisma.revokedToken.findUnique({
        where: { token_jti: decoded.jti },
      });

      if (revoked) {
        res.status(401).json({
          success: false,
          message: 'Token sudah tidak aktif. Silakan login kembali.',
          code: 'TOKEN_REVOKED',
        });
        return;
      }
    }

    // Simpan user payload ke request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Error pada middleware authenticate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
      code: 'INTERNAL_ERROR',
    });
  }
};
