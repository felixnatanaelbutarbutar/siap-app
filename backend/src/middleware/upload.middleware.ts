import multer from 'multer';

// Konfigurasi Multer
// Gunakan memory storage agar file buffer bisa diproses sharp sebelum di-upload ke MinIO
const storage = multer.memoryStorage();

// Filter: hanya izinkan file gambar
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Harap unggah gambar.'));
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5 MB
  },
});
