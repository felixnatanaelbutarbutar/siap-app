import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
process.env.NODE_ENV = 'test';

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test')) {
  throw new Error(
    `Unsafe DATABASE_URL for test runner: "${process.env.DATABASE_URL}". Must target a dedicated test database.`
  );
}

// In-memory MinIO object store mock so Sharp watermarking & PDFKit BAST flows run deterministically without network S3 calls
export const mockStorageObjects = new Map<string, Buffer>();

jest.mock('../src/services/storage.service', () => ({
  StorageUploadError: jest.requireActual('../src/services/storage.service').StorageUploadError,
  uploadFile: jest.fn(async (buffer: Buffer, filename: string) => {
    const cleanKey = filename.replace(/^\/+/, '');
    mockStorageObjects.set(cleanKey, Buffer.from(buffer));
    return `http://localhost:9000/siap-files-test/${cleanKey}`;
  }),
  downloadFile: jest.fn(async (keyOrUrl: string) => {
    const cleanKey = keyOrUrl
      .replace(/^https?:\/\/[^/]+\/[^/]+\//, '')
      .replace(/^\/+/, '');
    const found = mockStorageObjects.get(cleanKey);
    if (!found) {
      throw new Error(`Mock storage object not found: ${cleanKey}`);
    }
    return found;
  }),
  deleteFile: jest.fn(async (fileUrl: string) => {
    const cleanKey = fileUrl
      .replace(/^https?:\/\/[^/]+\/[^/]+\//, '')
      .replace(/^\/+/, '');
    mockStorageObjects.delete(cleanKey);
  }),
  getSignedUrl: jest.fn(async (key: string) => `http://localhost:9000/siap-files-test/${key}`),
}));

jest.mock('../src/services/notification.service', () => ({
  sendToDevice: jest.fn(async () => true),
  sendToRole: jest.fn(async () => 0),
}));

import { prisma } from '../src/lib/prisma';

beforeAll(async () => {
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
});

afterAll(async () => {
  mockStorageObjects.clear();
  await prisma.$disconnect();
});
