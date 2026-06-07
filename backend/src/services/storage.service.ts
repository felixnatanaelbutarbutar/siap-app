import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY!;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY!;
const BUCKET_NAME = process.env.MINIO_BUCKET || 'siap-storage';

const protocol = MINIO_USE_SSL ? 'https' : 'http';

// Inisialisasi S3 Client untuk MinIO
const s3Client = new S3Client({
  endpoint: `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}`,
  region: 'us-east-1', // Region default untuk MinIO (atau bebas)
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Wajib diatur 'true' untuk MinIO
});

/**
 * Upload file buffer ke MinIO bucket
 */
export const uploadFile = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    });

    await s3Client.send(command);

    // Kembalikan public URL dari file
    return getFileUrl(filename);
  } catch (error) {
    logger.error(`Error uploading file ${filename} to MinIO:`, error);
    throw new Error('Gagal mengunggah file ke server penyimpanan.');
  }
};

/**
 * Mendapatkan Public URL untuk file
 */
export const getFileUrl = (filename: string): string => {
  // Asumsi bucket MinIO telah di-set dengan public download (mc anonymous set download)
  // sesuai dengan command di docker-compose minio-init
  return `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}/${BUCKET_NAME}/${filename}`;
};

/**
 * Menghapus file dari MinIO
 */
export const deleteFile = async (filename: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });

    await s3Client.send(command);
  } catch (error) {
    logger.error(`Error deleting file ${filename} from MinIO:`, error);
    throw new Error('Gagal menghapus file dari server penyimpanan.');
  }
};
