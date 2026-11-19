import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CatatAktivitasAdminParams {
  adminId: string;
  tipeAksi: string;
  targetEntitas: string;
  targetId: string;
  keterangan: string;
  metadata?: any;
  ipAddress?: string;
}

/**
 * Mencatat rekam jejak setiap aksi yang dilakukan oleh admin
 */
export const catatAktivitasAdmin = async (params: CatatAktivitasAdminParams) => {
  try {
    const log = await prisma.aktivitasAdmin.create({
      data: {
        admin_id: params.adminId,
        tipe_aksi: params.tipeAksi,
        target_entitas: params.targetEntitas,
        target_id: params.targetId,
        keterangan: params.keterangan,
        metadata: params.metadata ?? undefined,
        ip_address: params.ipAddress ?? undefined,
      },
    });
    return log;
  } catch (error) {
    logger.error('Gagal mencatat aktivitas admin:', error);
    return null;
  }
};

export interface GetAktivitasFilter {
  adminId?: string;
  tipeAksi?: string;
  targetEntitas?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Mengambil daftar aktivitas admin dengan filter dan paginasi
 */
export const getDaftarAktivitasAdmin = async (filters: GetAktivitasFilter = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.adminId) where.admin_id = filters.adminId;
  if (filters.tipeAksi) where.tipe_aksi = filters.tipeAksi;
  if (filters.targetEntitas) where.target_entitas = filters.targetEntitas;

  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      where.created_at.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  const [total, items] = await Promise.all([
    prisma.aktivitasAdmin.count({ where }),
    prisma.aktivitasAdmin.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            nama: true,
            nik: true,
            role: true,
            foto_profil: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items,
  };
};
