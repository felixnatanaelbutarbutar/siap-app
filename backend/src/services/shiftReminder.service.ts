import { HariKerja, JenisAbsensi, Role, StatusIzin } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getIO } from '../lib/socket';
import { logger } from '../utils/logger';
import { sendToDevice } from './notification.service';
import { ZONE } from './workforce.service';

const WEEKDAY_MAP: Record<string, HariKerja> = {
  Sun: HariKerja.AHAD,
  Mon: HariKerja.SENIN,
  Tue: HariKerja.SELASA,
  Wed: HariKerja.RABU,
  Thu: HariKerja.KAMIS,
  Fri: HariKerja.JUMAT,
  Sat: HariKerja.SABTU,
};

// Deduplikasi in-memory agar satu shift hanya mengirim 1 notifikasi
const sentShiftReminders = new Set<string>();

export const getJakartaParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour').padStart(2, '0');
  const minute = get('minute').padStart(2, '0');
  const weekday = get('weekday');

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}`,
    hari: WEEKDAY_MAP[weekday] || HariKerja.SENIN,
  };
};

/**
 * Cek seluruh jadwal kerja aktif yang mulai tepat 1 jam dari sekarang (WIB)
 * dan kirim notifikasi pengingat (FCM + Socket.io) ke staff terkait.
 */
export const checkAndSendPreShiftReminders = async (now = new Date()): Promise<number> => {
  const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);
  const { dateStr: targetDate, timeStr: targetTime, hari: targetHari } = getJakartaParts(oneHourAhead);

  // Bersihkan cache deduplikasi dari hari sebelumnya
  if (sentShiftReminders.size > 500) {
    for (const key of sentShiftReminders) {
      if (!key.includes(`:${targetDate}:`)) {
        sentShiftReminders.delete(key);
      }
    }
  }

  const upcomingSchedules = await prisma.jadwalKerja.findMany({
    where: {
      aktif: true,
      hari: targetHari,
      jam_masuk: targetTime,
      staff: {
        aktif: true,
        role: { not: Role.ADMIN },
      },
    },
    include: {
      staff: {
        select: {
          id: true,
          nama: true,
          fcm_token: true,
          area_tugas: { select: { nama: true } },
        },
      },
    },
  });

  if (upcomingSchedules.length === 0) return 0;

  const targetDateObj = new Date(`${targetDate}T00:00:00.000Z`);
  const recentCheckInThreshold = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  let sentCount = 0;

  for (const jadwal of upcomingSchedules) {
    const staff = jadwal.staff;
    const dedupKey = `${staff.id}:${targetDate}:${jadwal.jam_masuk}`;
    if (sentShiftReminders.has(dedupKey)) continue;

    // Lewati jika staff sedang cuti / izin / sakit yang disetujui pada tanggal shift
    const activeLeave = await prisma.izinCuti.findFirst({
      where: {
        staff_id: staff.id,
        status: StatusIzin.APPROVED,
        tanggal_mulai: { lte: targetDateObj },
        tanggal_selesai: { gte: targetDateObj },
      },
      select: { id: true },
    });
    if (activeLeave) {
      sentShiftReminders.add(dedupKey);
      continue;
    }

    // Lewati jika staff sudah absen masuk lebih awal untuk shift ini
    const alreadyCheckedIn = await prisma.absensi.findFirst({
      where: {
        staff_id: staff.id,
        jenis: JenisAbsensi.MASUK,
        waktu_server: { gte: recentCheckInThreshold },
      },
      select: { id: true },
    });
    if (alreadyCheckedIn) {
      sentShiftReminders.add(dedupKey);
      continue;
    }

    const areaNama = staff.area_tugas?.nama || 'Area Tugas';
    const title = 'Shift Dimulai 1 Jam Lagi';
    const body = `Halo ${staff.nama}, shift Anda di ${areaNama} dimulai pukul ${jadwal.jam_masuk} WIB (${jadwal.jam_masuk} - ${jadwal.jam_keluar}). Harap bersiap menuju lokasi tugas.`;

    const payload = {
      type: 'shift_reminder',
      title,
      body,
      jam_masuk: jadwal.jam_masuk,
      jam_keluar: jadwal.jam_keluar,
      area_tugas: areaNama,
      tanggal: targetDate,
    };

    // 1. Kirim Push Notification via FCM jika token tersedia
    if (staff.fcm_token) {
      await sendToDevice(staff.fcm_token, title, body, {
        type: 'shift_reminder',
        jam_masuk: jadwal.jam_masuk,
        jam_keluar: jadwal.jam_keluar,
        area_tugas: areaNama,
        tanggal: targetDate,
      });
    }

    // 2. Kirim event real-time via Socket.io ke room staff terkait
    try {
      getIO().to(`staff:${staff.id}`).emit('shift:reminder', payload);
    } catch {
      // Abaikan jika Socket.io belum terinisialisasi (misal saat unit test)
    }

    sentShiftReminders.add(dedupKey);
    sentCount += 1;
    logger.info(`⏰ Pengingat 1 jam sebelum shift dikirim ke ${staff.nama} (Shift ${jadwal.jam_masuk} - ${jadwal.jam_keluar})`);
  }

  return sentCount;
};
