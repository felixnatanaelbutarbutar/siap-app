import { z } from 'zod';
import { TipePengumuman } from '@prisma/client';

export const createPengumumanSchema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi.').max(200, 'Judul maksimal 200 karakter.'),
  konten: z.string().min(1, 'Konten wajib diisi.').max(5000, 'Konten maksimal 5000 karakter.'),
  tipe: z.nativeEnum(TipePengumuman).default(TipePengumuman.INFO),
});
