import { z } from 'zod';
import { JenisSerahTerima } from '@prisma/client';

export const barangSchema = z.object({
  nama: z.string().min(1, 'Nama barang wajib diisi'),
  kondisi: z.enum(['BAIK', 'RUSAK', 'HILANG'], { required_error: 'Kondisi barang wajib diisi' }),
  catatan: z.string().optional(),
});

export const mulaiSerahTerimaSchema = z.object({
  jenis: z.nativeEnum(JenisSerahTerima, { required_error: 'Jenis serah terima wajib diisi' }),
  staff_baru_id: z.string({ required_error: 'ID staff penerima wajib diisi' }),
  barang_list: z.array(barangSchema).min(1, 'Minimal satu barang harus diserahterimakan'),
  catatan: z.string().optional(),
  foto_urls: z.array(z.string()).optional().default([]),
  ttd_lama: z.string({ required_error: 'Tanda tangan penyerah (base64) wajib disertakan' }),
});

export const konfirmasiSerahTerimaSchema = z.object({
  ttd_baru: z.string({ required_error: 'Tanda tangan penerima (base64) wajib disertakan' }),
});

export const getAdminSerahTerimaSchema = z.object({
  tanggal: z.string().optional(),
  jenis: z.nativeEnum(JenisSerahTerima).optional(),
  divisi: z.string().optional(),
});
