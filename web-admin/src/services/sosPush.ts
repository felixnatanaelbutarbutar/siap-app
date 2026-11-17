import { api, API_BASE_URL } from './api';

export const SOS_CHANNEL_STORAGE_KEY = 'siap-sos-channel-token';

export interface SosAlertItem {
  id: string;
  staff_id: string;
  kategori: string;
  keterangan: string;
  lat: number | null;
  lng: number | null;
  akurasi_gps: number | null;
  area_nama: string | null;
  status: 'AKTIF' | 'DITANGANI' | string;
  handled_by: string | null;
  handled_at: string | null;
  catatan_admin: string | null;
  created_at: string;
  staff: {
    id: string;
    nama: string;
    nik: string;
    divisi: string;
    role: string;
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getSavedSosChannelToken(): string | null {
  try {
    return localStorage.getItem(SOS_CHANNEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function playSosSiren(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now + offset);
      osc.frequency.linearRampToValueAtTime(1180, now + offset + 0.14);
      osc.frequency.linearRampToValueAtTime(880, now + offset + 0.28);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.29);
    });
  } catch {
    // Browser autoplay policy mungkin memblokir audio sebelum interaksi user
  }
}

export async function showBrowserSosNotification(alert: SosAlertItem): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `SOS DARURAT: ${alert.staff?.nama || 'Staff'} (${(alert.staff?.divisi || '').replace(/_/g, ' ')})`;
  const body = `[${alert.kategori}] ${alert.keterangan}${alert.area_nama ? ` | Area: ${alert.area_nama}` : ''}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.png',
          badge: '/favicon-32x32.png',
          tag: `siap-sos-${alert.id}`,
          requireInteraction: true,
          data: { url: '/sos', id: alert.id },
        });
        return;
      }
    }
  } catch {
    // Fallback ke Notification langsung
  }

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.png',
      tag: `siap-sos-${alert.id}`,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/sos';
    };
  } catch {}
}

export async function registerAdminSosBrowser(): Promise<{
  success: boolean;
  webPushEnabled: boolean;
  channelToken?: string;
  message: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, webPushEnabled: false, message: 'Browser tidak tersedia.' };
  }

  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  let pushEndpoint: string | undefined;
  let pushKeys: { p256dh: string; auth: string } | undefined;

  if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const vapidRes = await fetch(`${API_BASE_URL}/sos/vapid-public-key`);
      const vapidJson = await vapidRes.json();
      const publicKey = vapidJson?.data?.publicKey;

      if (publicKey) {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
          });
        }
        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          pushEndpoint = subJson.endpoint;
          pushKeys = { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth };
        }
      }
    } catch {
      // Tetap lanjut daftarkan channel fallback untuk lingkungan localhost/HTTP
    }
  }

  const existingToken = getSavedSosChannelToken() || undefined;
  const res = await api.post('/sos/subscribe', {
    endpoint: pushEndpoint,
    keys: pushKeys,
    existing_channel_token: existingToken,
  });

  const channelToken = res.data?.data?.channel_token;
  if (channelToken) {
    localStorage.setItem(SOS_CHANNEL_STORAGE_KEY, channelToken);
  }

  return {
    success: true,
    webPushEnabled: Boolean(res.data?.data?.web_push_enabled),
    channelToken,
    message:
      res.data?.message ||
      'Notifikasi SOS browser aktif. Browser tetap menerima peringatan meski tidak sedang login.',
  };
}

export async function unregisterAdminSosBrowser(): Promise<void> {
  const token = getSavedSosChannelToken();
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await api.post('/sos/unsubscribe', { endpoint: sub.endpoint, channel_token: token });
        await sub.unsubscribe();
      } else if (token) {
        await api.post('/sos/unsubscribe', { channel_token: token });
      }
    } else if (token) {
      await api.post('/sos/unsubscribe', { channel_token: token });
    }
  } catch {}
  localStorage.removeItem(SOS_CHANNEL_STORAGE_KEY);
}
