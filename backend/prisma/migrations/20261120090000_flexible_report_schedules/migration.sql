ALTER TABLE "laporan_perjam" ADD COLUMN "menit" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "checkpoint_at" TIMESTAMP(3);
DROP INDEX "laporan_perjam_staff_id_tanggal_jam_key";
CREATE UNIQUE INDEX "laporan_perjam_staff_id_tanggal_jam_menit_key" ON "laporan_perjam"("staff_id", "tanggal", "jam", "menit");
CREATE TABLE "report_schedule_settings" (
 "role" "Role" PRIMARY KEY,
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "times" JSONB NOT NULL DEFAULT '[]',
 "version" INTEGER NOT NULL DEFAULT 1,
 "updated_by" TEXT NOT NULL,
 "updated_at" TIMESTAMP(3) NOT NULL
);
