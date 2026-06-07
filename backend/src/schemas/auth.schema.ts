import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  nik: z
    .string({ required_error: 'NIK wajib diisi.' })
    .min(1, 'NIK tidak boleh kosong.')
    .max(20, 'NIK maksimal 20 karakter.'),
  password: z
    .string({ required_error: 'Password wajib diisi.' })
    .min(6, 'Password minimal 6 karakter.'),
});

export const fcmTokenSchema = z.object({
  fcm_token: z
    .string({ required_error: 'FCM token wajib diisi.' })
    .min(1, 'FCM token tidak boleh kosong.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;
