import { z } from 'zod';
import { Divisi, Role } from '@prisma/client';

export const getDashboardSummarySchema = z.object({
  // No specific params needed currently, maybe date in the future
});

export const getStatistikSchema = z.object({
  bulan: z.coerce.number().min(1).max(12).optional(),
  tahun: z.coerce.number().min(2000).max(2100).optional(),
  divisi: z.nativeEnum(Divisi).optional(),
});

export const exportAbsensiSchema = z.object({
  bulan: z.coerce.number().min(1).max(12).optional(),
  tahun: z.coerce.number().min(2000).max(2100).optional(),
  divisi: z.nativeEnum(Divisi).optional(),
  format: z.literal('csv').default('csv'),
});

// Master Staff Schema
export const createStaffSchema = z.object({
  nik: z.string().min(1),
  nama: z.string().min(1),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  divisi: z.nativeEnum(Divisi),
  area_tugas_id: z.string().optional().nullable(),
  aktif: z.boolean().default(true),
});

export const updateStaffSchema = z.object({
  nama: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  divisi: z.nativeEnum(Divisi).optional(),
  area_tugas_id: z.string().optional().nullable(),
  aktif: z.boolean().optional(),
});

// Master Area Tugas Schema
export const createAreaTugasSchema = z.object({
  nama: z.string().min(1),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius_meter: z.coerce.number().min(10).default(500),
  aktif: z.boolean().default(true),
});

export const updateAreaTugasSchema = z.object({
  nama: z.string().min(1).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_meter: z.coerce.number().min(10).optional(),
  aktif: z.boolean().optional(),
});

export const broadcastNotifikasiSchema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi'),
  pesan: z.string().min(1, 'Pesan wajib diisi'),
  divisi: z.nativeEnum(Divisi).optional(),
  role: z.nativeEnum(Role).optional(),
});
