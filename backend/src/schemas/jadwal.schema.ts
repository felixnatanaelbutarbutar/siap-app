import { z } from 'zod';
import { HariKerja } from '@prisma/client';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createJadwalSchema = z.object({
  staff_id: z.string().min(1, 'staff_id wajib diisi.'),
  hari: z.nativeEnum(HariKerja, {
    errorMap: () => ({ message: 'Hari kerja tidak valid.' }),
  }),
  jam_masuk: z.string().regex(timeRegex, 'Format jam_masuk harus HH:mm (00:00 - 23:59).'),
  jam_keluar: z.string().regex(timeRegex, 'Format jam_keluar harus HH:mm (00:00 - 23:59).'),
});

export const updateJadwalSchema = z.object({
  jam_masuk: z.string().regex(timeRegex, 'Format jam_masuk harus HH:mm (00:00 - 23:59).').optional(),
  jam_keluar: z.string().regex(timeRegex, 'Format jam_keluar harus HH:mm (00:00 - 23:59).').optional(),
  aktif: z.boolean().optional(),
});

export const updatePengaturanSchema = z.object({
  toleransi_keterlambatan_menit: z.coerce
    .number()
    .int()
    .min(0, 'Toleransi minimal 0 menit.')
    .max(180, 'Toleransi maksimal 180 menit.'),
});
