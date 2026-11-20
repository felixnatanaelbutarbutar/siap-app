import { z } from 'zod';
import { Divisi, KategoriLaporan, StatusLaporan, StatusKeamanan } from '@prisma/client';

export const kategoriPerDivisi: Record<string, string[]> = {
  [Divisi.KEAMANAN]: ['PATROLI', 'PENJAGAAN', 'PENGAWALAN', 'INSIDEN', 'PEMELIHARAAN'],
  [Divisi.CLEANING_SERVICE]: ['KEBERSIHAN', 'PEMBERSIHAN_AREA', 'SANITASI_TOILET', 'PENGELOLAAN_SAMPAH', 'STOK_PERLENGKAPAN', 'LAIN_LAIN'],
  [Divisi.UTILITY]: ['KEBERSIHAN', 'KERUSAKAN', 'PERBAIKAN', 'PEMERIKSAAN_RUTIN'],
};

// ─── Laporan Harian (Generik) ────────────────────────────────────────────────
export const createLaporanSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
  kategori: z.nativeEnum(KategoriLaporan, { required_error: 'Kategori laporan wajib diisi.' }),
  judul: z.string({ required_error: 'Judul laporan wajib diisi.' }).min(5, 'Judul minimal 5 karakter.'),
  deskripsi: z.string({ required_error: 'Deskripsi laporan wajib diisi.' }).min(10, 'Deskripsi minimal 10 karakter.'),
});

export const getLaporanSchema = z.object({
  tanggal: z.string().optional(),
});

export const updateLaporanSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED']).optional(),
  judul: z.string().min(5).optional(),
  deskripsi: z.string().min(10).optional(),
});

export const reviewLaporanSchema = z.object({
  status: z.enum([StatusLaporan.APPROVED, StatusLaporan.REJECTED]),
  komentar: z.string().optional(),
});

export const getAdminLaporanSchema = z.object({
  status: z.nativeEnum(StatusLaporan).optional(),
  tanggal: z.string().optional(),
  divisi: z.nativeEnum(Divisi).optional(),
  staff_id: z.string().optional(),
});

// ─── Laporan Per Jam (Khusus SATPAM) ─────────────────────────────────────────
export const createLaporanPerJamSchema = z.object({
  checkpoint: z.string().datetime(),
  jam: z.coerce.number().int().min(0).max(23, 'Jam harus antara 0 - 23'),
  status_keamanan: z.nativeEnum(StatusKeamanan, { required_error: 'Status keamanan wajib diisi.' }),
  catatan: z.string().optional(),
  lat: z.coerce.number({ required_error: 'Latitude wajib diisi.' }),
  lng: z.coerce.number({ required_error: 'Longitude wajib diisi.' }),
});

export const getAdminLaporanPerJamSchema = z.object({
  divisi: z.nativeEnum(Divisi).optional(),
  tanggal: z.string({ required_error: 'Tanggal wajib diisi.' }),
  staff_id: z.string().optional(),
});
