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
export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Kata sandi baru minimal 8 karakter.').max(72, 'Kata sandi maksimal 72 karakter.'),
}).refine(value => value.current_password !== value.new_password, { message: 'Gunakan kata sandi yang berbeda dari sebelumnya.' });
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;
