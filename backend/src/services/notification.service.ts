import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createPrivateKey } from 'crypto';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { Divisi, Role } from '@prisma/client';

// Prefer the service-account file; retain environment variables for deployments.
try {
  const accountPath=resolve(process.env.FCM_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json');
  let account: {projectId:string;clientEmail:string;privateKey:string}|undefined;
  if(existsSync(accountPath)) {
    const raw=JSON.parse(readFileSync(accountPath,'utf8'));
    account={projectId:raw.project_id,clientEmail:raw.client_email,privateKey:raw.private_key};
  } else if(process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes('YOUR_PRIVATE_KEY_HERE')) {
    account={projectId:process.env.FIREBASE_PROJECT_ID||'',clientEmail:process.env.FIREBASE_CLIENT_EMAIL||'',privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')};
  }
  if(account) {
    if(!account.projectId || !account.clientEmail)throw Error('Incomplete service account');
    createPrivateKey(account.privateKey);
    if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(account)});
    logger.info('Firebase Admin siap untuk push notification.');
  } else logger.warn('Push belum aktif: pasang serviceAccountKey.json atau environment Firebase yang valid.');
} catch {
  // Do not print credentials or SDK errors containing key material.
  logger.warn('Konfigurasi Firebase belum valid. Periksa file service account dan project Firebase.');
}

// ─── Core Sender ─────────────────────────────────────────────────────────────

/**
 * Kirim notifikasi ke satu perangkat (satu token)
 */
export const sendToDevice = async (fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> => {
  if (admin.apps.length === 0) return false;
  try {
    const message = {
      notification: { title, body },
      data: data || {},
      token: fcmToken,
      android: {priority:'high' as const, ...(data?.type==='reminder_laporan_perjam'?{notification:{channelId:'siap-reports',sound:'default'},ttl:Math.max(0,Math.min(300000,Date.parse(data.checkpoint||'')-Date.now()||300000))}:{})},
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
  if (tokens.length === 0 || admin.apps.length === 0) return;

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
