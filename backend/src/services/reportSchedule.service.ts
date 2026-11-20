import { prisma } from "../lib/prisma";
import { ensureShifts, localDate, addDays } from "./workforce.service";
import { sendToDevice } from "./notification.service";

export function reportSlots(start: Date, end: Date, times: string[]) {
  const slots = [];
  for (
    let date = localDate(start);
    date <= localDate(end);
    date = addDays(date, 1)
  ) {
    for (const time of [...new Set(times)].sort()) {
      const at = new Date(`${date}T${time}:00+07:00`);
      if (+at < +start || +at > +end) continue;
      const [hour, minute] = time.split(":").map(Number);
      slots.push({
        at: at.toISOString(),
        remind_at: new Date(+at - 5 * 60000).toISOString(),
        date,
        hour,
        minute,
        label: time,
      });
    }
  }
  return slots.sort((a, b) => a.at.localeCompare(b.at));
}
export async function reportSchedule(staffId: string, now = new Date()) {
  const person = await prisma.staff.findUniqueOrThrow({
    where: { id: staffId },
    select: { role: true, aktif: true },
  });
  const config = await prisma.reportScheduleSetting.findUnique({
    where: { role: person.role },
  });
  if (!person.aktif || !config?.enabled)
    return { shift: null, slots: [], active: false, enabled: false };
  const times = config.times as string[];
  const today = localDate(now);
  const shifts = await ensureShifts(
    staffId,
    addDays(today, -1),
    addDays(today, 1),
  );
  const shift =
    shifts.find((s) => +now >= +s.start_at && +now <= +s.end_at) ||
    shifts.find((s) => +now >= +s.start_at - 5 * 60000 && +now < +s.start_at) ||
    shifts.find((s) => +now > +s.end_at && +now <= +s.end_at + 15 * 60000);
  if (!shift) return { shift: null, slots: [], active: false };
  const leave = await prisma.izinCuti.findFirst({
    where: {
      staff_id: staffId,
      status: "APPROVED",
      tanggal_mulai: { lte: new Date(shift.date) },
      tanggal_selesai: { gte: new Date(shift.date) },
    },
  });
  if (leave) return { shift: null, slots: [], active: false };
  const events = await prisma.absensi.findMany({
    where: {
      staff_id: staffId,
      OR: [
        { shift_id: shift.id },
        {
          shift_id: null,
          waktu_server: { gte: shift.start_at, lte: shift.end_at },
        },
      ],
    },
  });
  const active =
    events.some((e) => e.jenis === "MASUK") &&
    !events.some((e) => e.jenis === "KELUAR");
  const slots = await Promise.all(
    reportSlots(shift.start_at, shift.end_at, times).map(async (slot) => ({
      ...slot,
      report: await prisma.laporanPerJam.findUnique({
        where: {
          staff_id_tanggal_jam_menit: {
            staff_id: staffId,
            tanggal: new Date(slot.date),
            jam: slot.hour,
            menit: slot.minute,
          },
        },
      }),
    })),
  );
  return {
    enabled: true,
    shift,
    slots,
    active,
    checkedOut: events.some((e) => e.jenis === "KELUAR"),
  };
}
let running = false;
export async function sendReportReminders(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const staff = await prisma.staff.findMany({
      where: {
        role: { in: ["SATPAM", "CS", "UTILITY"] },
        aktif: true,
        fcm_token: { not: null },
      },
    });
    for (const person of staff) {
      const schedule = await reportSchedule(person.id, now);
      // Scheduled employees only; early checkout and approved leave suppress reminders.
      if (!schedule.shift) continue;
      if (schedule.checkedOut) continue;
      for (const slot of schedule.slots) {
        if (
          slot.report ||
          +now < Date.parse(slot.remind_at) ||
          +now >= Date.parse(slot.at)
        )
          continue;
        const id = `report-reminder:${person.id}:${slot.at}`;
        try {
          await prisma.workforceAudit.create({
            data: {
              id,
              actor_id: "system",
              subject_id: person.id,
              action: "REPORT_REMINDER",
              reason: "Pengingat laporan H-5",
              detail: { at: slot.at, status: "SENDING" },
            },
          });
        } catch (e: any) {
          if (e.code === "P2002") continue;
          throw e;
        }
        const sent = await sendToDevice(
          person.fcm_token!,
          "Pengingat Laporan Terjadwal",
          `Jadwal laporan Anda pukul ${slot.label} WIB. Silakan siapkan laporan area tugas.`,
          { type: "reminder_laporan_perjam", checkpoint: slot.at },
        );
        if (sent)
          await prisma.workforceAudit.update({
            where: { id },
            data: { detail: { at: slot.at, status: "SENT" } },
          });
        else await prisma.workforceAudit.delete({ where: { id } });
      }
    }
  } finally {
    running = false;
  }
}
