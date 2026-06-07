import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Default Error Format
  let statusCode = err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server internal.';
  let code = err.code || 'INTERNAL_ERROR';

  // Prisma Error Handling
  if (err.code) {
    if (err.code === 'P2002') {
      statusCode = 409; // Conflict
      message = 'Data yang Anda masukkan sudah terdaftar (Duplikat).';
      code = 'PRISMA_P2002';
    } else if (err.code === 'P2025') {
      statusCode = 404; // Not Found
      message = 'Data tidak ditemukan di database.';
      code = 'PRISMA_P2025';
    }
  }

  // Zod Validation Error (If any)
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Data yang dikirim tidak valid.';
    code = 'VALIDATION_ERROR';
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.';
    code = 'AUTH_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Show stack trace only in dev
  });
};
