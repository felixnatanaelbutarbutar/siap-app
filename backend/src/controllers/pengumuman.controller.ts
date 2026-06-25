import { Request, Response } from 'express';
import { PrismaClient, TipePengumuman } from '@prisma/client';

const prisma = new PrismaClient();

// Get all announcements
export const getPengumuman = async (req: Request, res: Response) => {
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
export const createPengumuman = async (req: Request, res: Response) => {
  try {
    const { judul, konten, tipe } = req.body;
    // user ID comes from authMiddleware
    const admin_id = req.user?.id;

    if (!admin_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const pengumuman = await prisma.pengumuman.create({
      data: {
        judul,
        konten,
        tipe: tipe as TipePengumuman || 'INFO',
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
export const deletePengumuman = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.pengumuman.delete({ where: { id } });
    res.json({ success: true, message: 'Pengumuman deleted successfully' });
  } catch (error) {
    console.error('Error deleting pengumuman:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
