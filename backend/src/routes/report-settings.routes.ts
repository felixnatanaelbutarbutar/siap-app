import { Router } from "express";
import { z } from "zod";
import admin from "firebase-admin";
import { prisma } from "../lib/prisma";
import { safe } from "./device.routes";
const router = Router(); // Mounted behind the admin middleware.
export const reportRoles = ["SATPAM", "CS", "UTILITY"] as const;
export const scheduleInput = z
  .object({
    enabled: z.boolean(),
    times: z
      .array(
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Gunakan format HH:mm."),
      )
      .max(48),
    version: z.number().int().min(0),
  })
  .refine(
    (v) => !v.enabled || v.times.length > 0,
    "Tambahkan minimal satu jam sebelum mengaktifkan jadwal.",
  )
  .refine(
    (v) => new Set(v.times).size === v.times.length,
    "Jam laporan tidak boleh berulang.",
  );
router.get(
  "/",
  safe(async (_req, res) => {
    const settings = await prisma.reportScheduleSetting.findMany();
    res.json({
      data: {
        timezone: "Asia/Jakarta",
        reminder_minutes: 5,
        push_configured: admin.apps.length > 0,
        roles: reportRoles.map(
          (role) =>
            settings.find((s) => s.role === role) || {
              role,
              enabled: false,
              times: [],
              version: 0,
              updated_at: null,
            },
        ),
      },
    });
  }),
);
router.put(
  "/:role",
  safe(async (req, res) => {
    const role = z.enum(reportRoles).parse(req.params.role);
    const input = scheduleInput.parse(req.body);
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.reportScheduleSetting.findUnique({
          where: { role },
        });
        if ((existing?.version ?? 0) !== input.version)
          throw Error(
            "Jadwal telah diubah admin lain. Muat ulang sebelum menyimpan.",
          );
        const data = {
          enabled: input.enabled,
          times: [...input.times].sort(),
          updated_by: req.user!.id,
        };
        let saved;
        if (existing) {
          const changed = await tx.reportScheduleSetting.updateMany({
            where: { role, version: input.version },
            data: { ...data, version: { increment: 1 } },
          });
          if (!changed.count)
            throw Error("Jadwal berubah. Muat ulang halaman.");
          saved = await tx.reportScheduleSetting.findUniqueOrThrow({
            where: { role },
          });
        } else
          saved = await tx.reportScheduleSetting.create({
            data: { role, ...data },
          });
        await tx.workforceAudit.create({
          data: {
            actor_id: req.user!.id,
            subject_id: role,
            action: "REPORT_SCHEDULE_UPDATED",
            reason: "Pengaturan jadwal laporan",
            detail: {
              before: existing
                ? { enabled: existing.enabled, times: existing.times }
                : null,
              after: { enabled: saved.enabled, times: saved.times },
            },
          },
        });
        return saved;
      },
      { isolationLevel: "Serializable" },
    );
    res.json({ data: result });
  }),
);
export default router;
