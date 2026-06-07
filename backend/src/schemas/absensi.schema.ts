import { z } from 'zod';

export const koordinatSchema = z.object({
  lat: z.coerce.number({ required_error: 'Latitude wajib diisi.' }),
  lng: z.coerce.number({ required_error: 'Longitude wajib diisi.' }),
  akurasi_gps: z.coerce.number().optional(),
});

export const getRiwayatSchema = z.object({
  bulan: z.coerce.number().min(1).max(12).optional(),
  tahun: z.coerce.number().min(2000).max(2100).optional(),
});

export const getAdminAbsensiSchema = z.object({
  tanggal: z.string().optional(),
  staff_id: z.string().optional(),
  divisi: z.string().optional(),
});
