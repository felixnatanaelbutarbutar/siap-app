import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const VAPID_FILE = path.resolve(process.cwd(), '.vapid-keys.json');
let cachedKeys: VapidKeys | null = null;
let configured = false;

export function getVapidKeys(): VapidKeys {
  if (cachedKeys) return cachedKeys;

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    cachedKeys = { publicKey: envPub, privateKey: envPriv };
    return cachedKeys;
  }

  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
      if (parsed.publicKey && parsed.privateKey) {
        cachedKeys = parsed;
        return cachedKeys!;
      }
    }
  } catch (err) {
    logger.warn('Gagal membaca .vapid-keys.json, membuat kunci VAPID baru.');
  }

  const generated = webpush.generateVAPIDKeys();
  cachedKeys = generated;
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2), 'utf8');
  } catch (err) {
    logger.warn('Tidak dapat menyimpan .vapid-keys.json ke disk:', err);
  }
  return generated;
}

function ensureConfigured() {
  if (configured) return;
  const { publicKey, privateKey } = getVapidKeys();
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@siap.local';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendSosWebPush(alert: {
  id: string;
  kategori: string;
  keterangan: string;
  area_nama?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: Date | string;
  staff: { nama: string; nik: string; divisi: string };
}) {
  try {
    ensureConfigured();
    const subs = await prisma.webPushSubscription.findMany({
      where: { aktif: true },
    });

    const realPushSubs = subs.filter((s) => s.endpoint.startsWith('http'));
    if (realPushSubs.length === 0) return;

    const payload = JSON.stringify({
      type: 'SOS_ALERT',
      id: alert.id,
      title: `SOS DARURAT: ${alert.staff.nama} (${alert.staff.divisi.replace(/_/g, ' ')})`,
      body: `[${alert.kategori}] ${alert.keterangan}${alert.area_nama ? ` | Area: ${alert.area_nama}` : ''}`,
      kategori: alert.kategori,
      keterangan: alert.keterangan,
      staff: alert.staff,
      area_nama: alert.area_nama,
      lat: alert.lat,
      lng: alert.lng,
      url: '/sos',
      created_at: alert.created_at,
    });

    await Promise.allSettled(
      realPushSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { urgency: 'high', TTL: 3600 }
          );
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await prisma.webPushSubscription.update({
              where: { id: sub.id },
              data: { aktif: false },
            });
          } else {
            logger.warn(`WebPush SOS gagal ke ${sub.id}: ${err?.message || status}`);
          }
        }
      })
    );
  } catch (err) {
    logger.error('Error sendSosWebPush:', err);
  }
}
