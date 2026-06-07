import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, updateFcmToken, getMe, uploadFotoProfil } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

// ─── Rate limiter khusus login ────────────────────────────────────────────────
// Maksimal 5 attempt per IP per 10 menit
const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '600000', 10), // 10 menit
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),         // 5 attempts
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi dalam 10 menit.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Memory store (default) — cukup untuk 100 user, tidak butuh Redis
  skip: (req) => process.env.NODE_ENV === 'test', // skip saat testing
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public routes (tidak perlu token)
router.post('/login', loginRateLimiter, login);

// Protected routes (perlu token)
router.post('/logout', authenticate, logout);
router.post('/fcm-token', authenticate, updateFcmToken);
router.get('/me', authenticate, getMe);
router.put('/profil/foto', authenticate, uploadImage.single('foto'), uploadFotoProfil);

export default router;
