import { Request, Response, NextFunction } from 'express';

// ─── requireRole middleware ───────────────────────────────────────────────────
/**
 * Cek apakah role user yang login termasuk dalam daftar roles yang diizinkan.
 * Gunakan setelah middleware authenticate.
 *
 * Contoh:
 *   requireRole('ADMIN')
 *   requireRole('SATPAM', 'CS', 'UTILITY')
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak. Hanya ${roles.join(' atau ')} yang dapat mengakses endpoint ini.`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};

// ─── requireDivisi middleware ─────────────────────────────────────────────────
/**
 * Cek apakah divisi user yang login termasuk dalam daftar divisi yang diizinkan.
 * Gunakan setelah middleware authenticate.
 *
 * Contoh:
 *   requireDivisi('KEAMANAN')
 *   requireDivisi('KEAMANAN', 'UTILITY')
 */
export const requireDivisi = (...divisiList: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    if (!divisiList.includes(req.user.divisi)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak. Hanya divisi ${divisiList.join(' atau ')} yang dapat mengakses endpoint ini.`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};

// ─── requireSelf middleware ───────────────────────────────────────────────────
/**
 * Cek apakah user mengakses resource miliknya sendiri atau user adalah ADMIN.
 * Gunakan untuk endpoint seperti GET /staff/:id (staff hanya bisa lihat diri sendiri).
 *
 * @param paramName - nama URL param yang berisi ID staff (default: 'id')
 */
export const requireSelfOrAdmin = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Tidak terautentikasi.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const targetId = req.params[paramName];

    if (req.user.role === 'ADMIN' || req.user.id === targetId) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Anda hanya dapat mengakses data milik sendiri.',
      code: 'FORBIDDEN',
    });
  };
};
