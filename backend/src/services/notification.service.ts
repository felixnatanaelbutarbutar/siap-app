import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { Divisi, Role } from '@prisma/client';

// Inisialisasi Firebase Admin
try {
  // Parsing private key karena newline dari dotenv kadang masih berupa literal '\n'
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!privateKey) {
    logger.warn('Firebase Private Key tidak ditemukan di environment. Push notification mungkin tidak berjalan.');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    logger.info('Firebase Admin SDK berhasil diinisialisasi.');
  }
} catch (error) {
  logger.error('Gagal inisialisasi Firebase Admin:', error);
}

// ─── Core Sender ─────────────────────────────────────────────────────────────

/**
 * Kirim notifikasi ke satu perangkat (satu token)
 */
export const sendToDevice = async (fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> => {
  try {
    const message = {
      notification: { title, body },
      data: data || {},
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Notifikasi berhasil dikirim ke perangkat: ${response}`);
    return true;
  } catch (error) {
    logger.error('Error sendToDevice:', error);
    return false;
  }
};

/**
 * Kirim notifikasi massal ke beberapa token
 */
export const sendMulticast = async (tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> => {
  if (tokens.length === 0) return;

  try {
    const message = {
      notification: { title, body },
      data: data || {},
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`Notifikasi multicast selesai: ${response.successCount} sukses, ${response.failureCount} gagal.`);
  } catch (error) {
    logger.error('Error sendMulticast:', error);
  }
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Kirim notifikasi ke seluruh staff dalam suatu divisi
 */
export const sendToDivisi = async (divisi: Divisi, title: string, body: string, data?: Record<string, string>): Promise<void> => {
  try {
    const staffList = await prisma.staff.findMany({
      where: { divisi, aktif: true, fcm_token: { not: null } },
      select: { fcm_token: true },
    });

    const tokens = staffList.map(s => s.fcm_token as string);
    await sendMulticast(tokens, title, body, data);
  } catch (error) {
    logger.error('Error sendToDivisi:', error);
  }
};

/**
 * Kirim notifikasi ke seluruh staff dengan role tertentu
 */
export const sendToRole = async (role: Role, title: string, body: string, data?: Record<string, string>): Promise<void> => {
  try {
    const staffList = await prisma.staff.findMany({
      where: { role, aktif: true, fcm_token: { not: null } },
      select: { fcm_token: true },
    });

    const tokens = staffList.map(s => s.fcm_token as string);
    await sendMulticast(tokens, title, body, data);
  } catch (error) {
    logger.error('Error sendToRole:', error);
  }
};
