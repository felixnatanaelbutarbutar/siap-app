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

/**
 * Jadwalkan pengingat laporan rutin 6 jam yang berbunyi tepat 5 MENIT SEBELUM jam laporan tiba.
 * @param jamMasuk Waktu absen masuk
 * @param durasiShiftJam Total durasi shift (default 12 jam)
 */
export const setupLaporan6JamReminders = async (
  jamMasuk: Date = new Date(),
  durasiShiftJam = 12
): Promise<void> => {
  try {
    const channelId = await ensureLaporanReminderChannel(true);
    if (!channelId) return;

    // Bersihkan notifikasi lama terlebih dahulu
    await cancelAllLaporanReminders();

    const now = Date.now();
    const intervalJam = 6;

    // Generate titik waktu laporan setiap 6 jam selama durasi shift
    for (let offset = intervalJam; offset <= durasiShiftJam; offset += intervalJam) {
      const checkpointTime = new Date(jamMasuk.getTime() + offset * 60 * 60 * 1000);
      
      // Target pemicu: 5 MENIT SEBELUM jam checkpoint tiba
      const triggerTimeMs = checkpointTime.getTime() - 5 * 60 * 1000;

      // Hanya jadwalkan jika waktu pemicu masih di masa depan
      if (triggerTimeMs > now) {
        const jamTargetStr = format(checkpointTime, 'HH:mm');
        const notifId = `${LAPORAN_NOTIF_PREFIX}${checkpointTime.getHours()}`;

        await notifee.createTriggerNotification(
          {
            id: notifId,
            title: 'Pengingat Laporan 6 Jam (5 Menit Lagi)',
            body: `Waktu pengisian laporan rutin 6 jam akan tiba pukul ${jamTargetStr}. Segera lakukan pengecekan area tugas dan submit laporan Anda.`,
            android: {
              channelId: LAPORAN_CHANNEL_ID,
              pressAction: { id: 'default' },
            },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerTimeMs,
          }
        );

        console.log(
          `[LaporanReminder] Dijadwalkan untuk jam ${jamTargetStr} (Trigger: ${format(new Date(triggerTimeMs), 'HH:mm:ss')})`
        );
      }
    }
  } catch (error) {
    console.log('[LaporanReminder] Gagal menjadwalkan pengingat laporan 6 jam:', error);
  }
};

// Alias untuk kompatibilitas
export const setupLaporan3JamReminders = setupLaporan6JamReminders;
