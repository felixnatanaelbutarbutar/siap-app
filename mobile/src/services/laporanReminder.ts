import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { format } from 'date-fns';

export const LAPORAN_CHANNEL_ID = 'laporan-6jam';
export const LAPORAN_NOTIF_PREFIX = 'laporan_reminder_';

let hasPromptedLaporanNotifPermission = false;

/**
 * Memastikan channel notifikasi pengingat laporan 6 jam tersedia
 */
export const ensureLaporanReminderChannel = async (allowPrompt = false): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (!granted) {
        if (!allowPrompt || hasPromptedLaporanNotifPermission) return null;
        hasPromptedLaporanNotifPermission = true;
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (res !== PermissionsAndroid.RESULTS.GRANTED) return null;
      }
    } else if (allowPrompt && !hasPromptedLaporanNotifPermission) {
      hasPromptedLaporanNotifPermission = true;
      await notifee.requestPermission();
    }

    const channelId = await notifee.createChannel({
      id: LAPORAN_CHANNEL_ID,
      name: 'Pengingat Laporan 6 Jam',
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: 'default',
    });

    return channelId;
  } catch (error) {
    console.log('[LaporanReminder] Gagal membuat channel notifikasi:', error);
    return null;
  }
};

/**
 * Batalkan semua notifikasi pengingat laporan 6 jam
 */
export const cancelAllLaporanReminders = async (): Promise<void> => {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const laporanIds = ids.filter((id) => id.startsWith(LAPORAN_NOTIF_PREFIX) || id === 'satpam_hourly_reminder');
    await Promise.all(laporanIds.map((id) => notifee.cancelNotification(id)));
    console.log('[LaporanReminder] Semua pengingat laporan 6 jam dibatalkan');
  } catch (error) {
    console.log('[LaporanReminder] Gagal membatalkan pengingat:', error);
  }
};

/**
 * Batalkan notifikasi pengingat laporan spesifik untuk jam tertentu
 */
export const cancelLaporanReminderForHour = async (hour: number): Promise<void> => {
  try {
    const notifId = `${LAPORAN_NOTIF_PREFIX}${hour}`;
    await notifee.cancelNotification(notifId);
    console.log(`[LaporanReminder] Pengingat jam ${hour} dibatalkan`);
  } catch (error) {
    console.log(`[LaporanReminder] Gagal membatalkan pengingat jam ${hour}:`, error);
  }
};

// Server checks the current shift and leave status immediately before sending FCM.
// Remove legacy local triggers so schedule edits cannot leave stale/duplicate alarms.
export const setupLaporan6JamReminders = async (_legacyStart?: Date): Promise<void> => {
  await cancelAllLaporanReminders();
};
export const setupLaporan3JamReminders = setupLaporan6JamReminders;
