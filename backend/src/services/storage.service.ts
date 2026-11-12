import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = process.env.MINIO_PORT || '9000';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';
const BUCKET_NAME = process.env.MINIO_BUCKET || process.env.MINIO_BUCKET_NAME || 'siap-storage';

const protocol = MINIO_USE_SSL ? 'https' : 'http';

// Inisialisasi S3 Client untuk MinIO
const s3Client = new S3Client({
  endpoint: `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

const extractObjectKey = (keyOrUrl: string): string => {
  if (!keyOrUrl.includes('://')) {
    return keyOrUrl.replace(/^\/+/, '');
  }
  try {
    const parsed = new URL(keyOrUrl);
    const prefix = `/${BUCKET_NAME}/`;
    if (parsed.pathname.startsWith(prefix)) {
      return parsed.pathname.slice(prefix.length);
    }
    const parts = parsed.pathname.replace(/^\/+/, '').split('/');
    return parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
  } catch {
    return keyOrUrl;
  }
};

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

    return getFileUrl(filename);
  } catch (error) {
    logger.error(`Error uploading file ${filename} to MinIO:`, error);
    throw new Error('Gagal mengunggah file ke server penyimpanan.');
  }
};

/**
 * Download file buffer dari MinIO bucket berdasarkan key atau public URL
 */
export const downloadFile = async (keyOrUrl: string): Promise<Buffer> => {
  try {
    const key = extractObjectKey(keyOrUrl);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('Objek kosong pada server penyimpanan.');
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    logger.error(`Error downloading file ${keyOrUrl} from MinIO:`, error);
    throw new Error('Gagal mengunduh file dari server penyimpanan.');
  }
};

/**
 * Mendapatkan Public URL untuk file
 */
export const getFileUrl = (filename: string): string => {
  const publicBase = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '');
  if (publicBase) {
    return `${publicBase}/${BUCKET_NAME}/${filename}`;
  }
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
