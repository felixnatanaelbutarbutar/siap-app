import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, TimestampTrigger, TriggerType } from '@notifee/react-native';
import Toast from 'react-native-toast-message';
import { api } from './api';
import { useAuthStore } from '../store/auth.store';

const SHIFT_CHANNEL_ID = 'shift-reminder';
const SHIFT_NOTIF_PREFIX = 'shift_reminder_';
const HARI_MAP = ['AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;

let isSyncingReminders = false;
let lastReminderSyncAt = 0;
let hasPromptedNotifPermission = false;

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseShiftTimeToday = (jamMasuk?: string | null, now = new Date()): Date | null => {
  if (!jamMasuk || !/^\d{1,2}:\d{2}$/.test(jamMasuk.trim())) return null;
  const [hourStr, minStr] = jamMasuk.trim().split(':');
  const hour = Number(hourStr);
  const minute = Number(minStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
};

/**
 * Mengembalikan sisa menit menuju jam masuk hari ini jika berada dalam jendela 1..60 menit.
 */
export const getMinutesUntilShift = (jamMasuk?: string | null, now = new Date()): number | null => {
  const start = parseShiftTimeToday(jamMasuk, now);
  if (!start) return null;
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0 || diffMs > 60 * 60 * 1000) return null;
  return Math.ceil(diffMs / 60000);
};

export const ensureShiftReminderChannel = async (allowPrompt = false): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (!granted) {
        if (!allowPrompt || hasPromptedNotifPermission) return null;
        hasPromptedNotifPermission = true;
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (res !== PermissionsAndroid.RESULTS.GRANTED) return null;
      }
    } else if (allowPrompt && !hasPromptedNotifPermission) {
      hasPromptedNotifPermission = true;
      await notifee.requestPermission();
    }

    const channelId = await notifee.createChannel({
      id: SHIFT_CHANNEL_ID,
      name: 'Pengingat Shift',
      description: 'Notifikasi 1 jam sebelum shift kerja dimulai',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    return channelId;
  } catch (error) {
    console.log('Gagal membuat channel pengingat shift:', error);
    return null;
  }
};

export const cancelShiftReminders = async (): Promise<void> => {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const shiftIds = ids.filter((id) => id.startsWith(SHIFT_NOTIF_PREFIX));
    await Promise.all(shiftIds.map((id) => notifee.cancelNotification(id)));
  } catch (error) {
    console.log('Gagal membatalkan pengingat shift:', error);
  }
};

export const cancelTodayShiftReminder = async (): Promise<void> => {
  try {
    const todayId = `${SHIFT_NOTIF_PREFIX}${formatDateKey(new Date())}`;
    await notifee.cancelNotification(todayId);
  } catch (error) {
    console.log('Gagal membatalkan pengingat shift hari ini:', error);
  }
};

export const displayShiftReminderNow = async (title: string, body: string): Promise<void> => {
  try {
    Toast.show({
      type: 'info',
      text1: title,
      text2: body,
      visibilityTime: 6000,
    });

    const channelId = await ensureShiftReminderChannel();
    if (!channelId) return;

    await notifee.displayNotification({
      id: `${SHIFT_NOTIF_PREFIX}live_${Date.now()}`,
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (error) {
    console.log('Gagal menampilkan notifikasi pengingat shift:', error);
  }
};

/**
 * Sinkronisasi jadwal kerja mingguan staff dari backend dan jadwalkan notifikasi lokal
 * tepat 1 jam sebelum setiap shift dimulai untuk 7 hari ke depan.
 */
export const syncShiftReminders = async (
  options?: { force?: boolean; allowPrompt?: boolean }
): Promise<void> => {
  const { token, user } = useAuthStore.getState();
  if (!token || !user || user.role === 'ADMIN') return;
  if (isSyncingReminders) return;
  if (!options?.force && Date.now() - lastReminderSyncAt < 60_000) return;

  isSyncingReminders = true;
  try {
    const channelId = await ensureShiftReminderChannel(Boolean(options?.allowPrompt));
    if (!channelId) return;

    const [jadwalRes, absensiRes] = await Promise.all([
      api.get('/absensi/jadwal-mingguan'),
      api.get('/absensi/hari-ini').catch(() => ({ data: { data: [] } })),
    ]);

    lastReminderSyncAt = Date.now();

    const jadwalList: any[] = Array.isArray(jadwalRes.data?.data) ? jadwalRes.data.data : [];
    const absensiHariIni: any[] = Array.isArray(absensiRes.data?.data) ? absensiRes.data.data : [];
    const sudahMasukHariIni = absensiHariIni.some((a) => a.jenis === 'MASUK');

    await cancelShiftReminders();

    if (jadwalList.length === 0) return;

    const now = new Date();
    const areaNama = user.area_tugas?.nama || 'Area Tugas';

    for (let offset = 0; offset < 7; offset++) {
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0);
      const hariNama = HARI_MAP[targetDay.getDay()];
      const jadwal = jadwalList.find((j) => j.hari === hariNama && j.aktif !== false);
      if (!jadwal?.jam_masuk) continue;

      if (offset === 0 && sudahMasukHariIni) continue;

      const [hourStr, minStr] = String(jadwal.jam_masuk).split(':');
      const hour = Number(hourStr);
      const minute = Number(minStr);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

      const shiftStart = new Date(
        targetDay.getFullYear(),
        targetDay.getMonth(),
        targetDay.getDate(),
        hour,
        minute,
        0,
        0
      );

      const triggerTimestamp = shiftStart.getTime() - 60 * 60 * 1000;
      if (triggerTimestamp <= Date.now() + 5000) continue;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTimestamp,
      };

      const notifId = `${SHIFT_NOTIF_PREFIX}${formatDateKey(targetDay)}`;

      await notifee.createTriggerNotification(
        {
          id: notifId,
          title: 'Shift Dimulai 1 Jam Lagi',
          body: `Shift Anda di ${areaNama} dimulai pukul ${jadwal.jam_masuk} (${jadwal.jam_masuk} - ${jadwal.jam_keluar}). Harap bersiap menuju lokasi tugas.`,
          data: {
            type: 'shift_reminder',
            jam_masuk: String(jadwal.jam_masuk),
            jam_keluar: String(jadwal.jam_keluar || ''),
            tanggal: formatDateKey(targetDay),
          },
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
          },
          ios: {
            sound: 'default',
          },
        },
        trigger
      );
    }
  } catch (error) {
    console.log('Gagal menyinkronkan pengingat shift:', error);
  } finally {
    isSyncingReminders = false;
  }
};
