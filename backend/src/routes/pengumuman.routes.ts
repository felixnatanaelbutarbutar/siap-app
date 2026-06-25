import { Router } from 'express';
import { getPengumuman, createPengumuman, deletePengumuman } from '../controllers/pengumuman.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Everyone logged in can view announcements
router.get('/', authenticate, getPengumuman);

// Only ADMIN can create and delete announcements
router.post('/', authenticate, requireRole('ADMIN'), createPengumuman);
router.delete('/:id', authenticate, requireRole('ADMIN'), deletePengumuman);

export default router;
