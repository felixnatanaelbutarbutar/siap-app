import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

beforeAll(async () => {
  // Push skema ke database tes
  console.log('🔄 Menyiapkan database pengujian...');
  execSync('npx prisma db push --accept-data-loss', { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });
});

afterAll(async () => {
  // Bersihkan koneksi prisma setelah semua tes selesai
  await prisma.$disconnect();
});
