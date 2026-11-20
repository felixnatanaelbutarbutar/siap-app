import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { prisma } from "../lib/prisma";
import { safe } from "./device.routes";
import { deleteFile, getFileUrl } from "../services/storage.service";

const router = Router(); // Mounted behind admin authentication.
const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const selection = z.object({
  kind: z.enum(["HARIAN", "PER_JAM"]),
  divisi: z.enum(["KEAMANAN", "CLEANING_SERVICE", "UTILITY"]).optional(),
  id: z.string().min(1).optional(),
  from: month.optional(),
  to: month.optional(),
  includePending: z.boolean().default(false),
});
const fingerprint = (rows: any[]) =>
  createHash("sha256").update(JSON.stringify(rows)).digest("hex");
function whereFor(s: z.infer<typeof selection>) {
  const scope = s.divisi
    ? s.kind === "HARIAN"
      ? { divisi: s.divisi }
      : { staff: { divisi: s.divisi } }
    : {};
  if (s.id) return { id: s.id, ...scope };
  if (!s.from || !s.to || s.from > s.to)
    throw Error("Pilih bulan awal dan akhir yang valid.");
  const [year, m] = s.to.split("-").map(Number);
  const end = new Date(Date.UTC(year, m, 1) - 7 * 3600000);
  return {
    ...scope,
    created_at: { gte: new Date(`${s.from}-01T00:00:00+07:00`), lt: end },
    ...(s.kind === "HARIAN" && !s.includePending
      ? { status: { in: ["APPROVED", "REJECTED"] } }
      : {}),
  };
}
async function rowsFor(db: any, s: any) {
  return (s.kind === "HARIAN" ? db.laporan : db.laporanPerJam).findMany({
    where: whereFor(s),
    orderBy: { id: "asc" },
    take: 500,
  });
}
const cleaning = new Set<string>();
async function cleanup(id: string) {
  if (cleaning.has(id))
    throw Error("Pembersihan masih berjalan. Tunggu sebentar.");
  cleaning.add(id);
  try {
    return await cleanupBatch(id);
  } finally {
    cleaning.delete(id);
  }
}
async function cleanupBatch(id: string) {
  const job = await prisma.workforceAudit.findUniqueOrThrow({ where: { id } });
  const detail = job.detail as any;
  const remaining: string[] = detail.pending.slice(25);
  let deleted = detail.deletedPhotos || 0;
  let retained = detail.retainedPhotos || 0;
  for (const url of detail.pending.slice(0, 25) as string[]) {
    // Only report-owned objects from our configured bucket; never arbitrary URLs.
    const base = getFileUrl("");
    if (
      !url.startsWith(base) ||
      !/^(laporan|laporan-perjam)\//.test(url.slice(base.length))
    ) {
      retained++;
      continue;
    }
    try {
      const used = await Promise.all([
        prisma.laporan.count({
          where: { foto_urls: { array_contains: [url] } },
        }),
        prisma.laporanPerJam.count({ where: { foto_url: url } }),
        prisma.absensi.count({ where: { foto_url: url } }),
        prisma.staff.count({ where: { foto_profil: url } }),
        prisma.izinCuti.count({ where: { foto_url: url } }),
        prisma.serahTerima.count({
          where: { foto_urls: { array_contains: [url] } },
        }),
      ]);
      if (used.some(Boolean)) {
        retained++;
        continue;
      }
      await deleteFile(url.slice(base.length));
      deleted++;
    } catch {
      remaining.push(url);
    }
  }
  const next = {
    ...detail,
    pending: remaining,
    deletedPhotos: deleted,
    retainedPhotos: retained,
  };
  await prisma.workforceAudit.update({ where: { id }, data: { detail: next } });
  return {
    id,
    count: detail.count,
    deletedPhotos: deleted,
    retainedPhotos: retained,
    pendingPhotos: remaining.length,
  };
}
router.post(
  "/preview",
  safe(async (req, res) => {
    const s = selection.parse(req.body);
    const rows = await rowsFor(prisma, s);
    const total = await (
      s.kind === "HARIAN" ? prisma.laporan : (prisma.laporanPerJam as any)
    ).count({ where: whereFor(s) });
    const token = jwt.sign(
      {
        purpose: "report-delete",
        actor: req.user!.id,
        selection: s,
        hash: fingerprint(rows),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "10m" },
    );
    res.json({
      data: {
        token,
        total,
        count: rows.length,
        photos: rows.reduce(
          (n: number, r: any) =>
            n +
            (s.kind === "HARIAN"
              ? Array.isArray(r.foto_urls)
                ? r.foto_urls.length
                : 0
              : r.foto_url
                ? 1
                : 0),
          0,
        ),
        sample: rows.slice(0, 5).map((r: any) => ({
          id: r.id,
          title: r.judul || `Patroli jam ${r.jam}`,
          date: r.created_at,
        })),
      },
    });
  }),
);
router.post(
  "/confirm",
  safe(async (req, res) => {
    const body = z
      .object({
        token: z.string(),
        confirmation: z.literal("HAPUS"),
        reason: z.string().trim().min(5).max(500),
      })
      .parse(req.body);
    const proof = jwt.verify(body.token, process.env.JWT_SECRET!) as any;
    if (proof.purpose !== "report-delete" || proof.actor !== req.user!.id)
      throw Error("Konfirmasi tidak valid.");
    const s = selection.parse(proof.selection);
    const job = await prisma.$transaction(
      async (tx) => {
        const rows = await rowsFor(tx, s);
        if (
          !rows.length ||
          rows.length > 500 ||
          fingerprint(rows) !== proof.hash
        )
          throw Error("Data berubah atau sudah dihapus. Muat ulang pratinjau.");
        const urls = [
          ...new Set<string>(
            rows.flatMap((r: any) =>
              s.kind === "HARIAN"
                ? Array.isArray(r.foto_urls)
                  ? r.foto_urls
                  : []
                : r.foto_url
                  ? [r.foto_url]
                  : [],
            ),
          ),
        ];
        const ids = rows.map((r: any) => r.id);
        if (s.kind === "HARIAN")
          await tx.laporan.deleteMany({ where: { id: { in: ids } } });
        else await tx.laporanPerJam.deleteMany({ where: { id: { in: ids } } });
        return tx.workforceAudit.create({
          data: {
            actor_id: req.user!.id,
            subject_id: "reports",
            action: "REPORT_CLEANUP",
            reason: body.reason,
            detail: { selection: s, count: rows.length, pending: urls },
          },
        });
      },
      { isolationLevel: "Serializable", timeout: 20000 },
    );
    res.json({ data: await cleanup(job.id) });
  }),
);
router.get(
  "/jobs",
  safe(async (req, res) => {
    const divisi = selection.shape.divisi.parse(req.query.divisi);
    const scope: any = divisi
      ? { detail: { path: ["selection", "divisi"], equals: divisi } }
      : {};
    const jobs = await prisma.workforceAudit.findMany({
      where: { action: "REPORT_CLEANUP", ...scope },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    const pending = await prisma.workforceAudit.findMany({
      where: {
        action: "REPORT_CLEANUP",
        detail: { path: ["pending"], not: [] },
        AND: [scope],
      },
      orderBy: { created_at: "desc" },
    });
    const visible = [
      ...new Map([...pending, ...jobs].map((j) => [j.id, j])).values(),
    ];
    res.json({
      data: visible.map((j) => ({
        id: j.id,
        date: j.created_at,
        reason: j.reason,
        divisi: (j.detail as any).selection?.divisi || null,
        count: (j.detail as any).count,
        pendingPhotos: (j.detail as any).pending.length,
      })),
    });
  }),
);
router.post(
  "/jobs/:id/retry",
  safe(async (req, res) => {
    const job = await prisma.workforceAudit.findFirst({
      where: { id: req.params.id, action: "REPORT_CLEANUP" },
    });
    if (!job) throw Error("Pekerjaan tidak ditemukan.");
    res.json({ data: await cleanup(job.id) });
  }),
);
export default router;
