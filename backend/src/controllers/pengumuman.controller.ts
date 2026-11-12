import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { createPengumumanSchema } from '../schemas/pengumuman.schema';

// Get all announcements
export const getPengumuman = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pengumuman = await prisma.pengumuman.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        admin: {
          select: { nama: true }
        }
      }
    });
    res.json({ success: true, data: pengumuman });
  } catch (error) {
    console.error('Error getting pengumuman:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create new announcement (Admin only ideally, but we'll check token in route)
export const createPengumuman = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin_id = req.user?.id;

    if (!admin_id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parsed = createPengumumanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { judul, konten, tipe } = parsed.data;

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul,
        konten,
        tipe,
        admin_id
      }
    });

    res.status(201).json({ success: true, data: pengumuman });
  } catch (error) {
    console.error('Error creating pengumuman:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete announcement
export const deletePengumuman = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.pengumuman.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan.' });
      return;
    }
    await prisma.pengumuman.delete({ where: { id } });
    res.json({ success: true, message: 'Pengumuman deleted successfully' });
  } catch (error) {
    console.error('Error deleting pengumuman:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
