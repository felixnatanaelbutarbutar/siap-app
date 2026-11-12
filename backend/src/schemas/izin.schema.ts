import { z } from 'zod';
import { JenisIzin } from '@prisma/client';

export const createIzinSchema = z
  .object({
    jenis: z.nativeEnum(JenisIzin, {
      errorMap: () => ({ message: 'Jenis izin harus IZIN, CUTI, atau SAKIT.' }),
    }),
    tanggal_mulai: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Format tanggal_mulai tidak valid.',
    }),
    tanggal_selesai: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Format tanggal_selesai tidak valid.',
    }),
    keterangan: z.string().min(3, 'Keterangan minimal 3 karakter.').max(1000),
  })
  .refine(
    (data) => new Date(data.tanggal_selesai).getTime() >= new Date(data.tanggal_mulai).getTime(),
    {
      message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
      path: ['tanggal_selesai'],
    }
  );

export const reviewIzinSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status review harus APPROVED atau REJECTED.' }),
  }),
  komentar_admin: z.string().max(500).optional(),
});
