import multer from 'multer';

// Konfigurasi Multer
// Gunakan memory storage agar file buffer bisa diproses sharp sebelum di-upload ke MinIO
const storage = multer.memoryStorage();

// Filter: hanya izinkan file gambar
const fileFilter = (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const err = new Error('Format file tidak didukung. Harap unggah gambar.') as Error & {
      status?: number;
      code?: string;
    };
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5 MB
  },
});
