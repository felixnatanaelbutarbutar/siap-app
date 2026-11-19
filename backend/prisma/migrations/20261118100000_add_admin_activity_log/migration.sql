-- AlterTable
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT,
ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "aktivitas_admin" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "tipe_aksi" TEXT NOT NULL,
    "target_entitas" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aktivitas_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "aktivitas_admin_admin_id_idx" ON "aktivitas_admin"("admin_id");
CREATE INDEX IF NOT EXISTS "aktivitas_admin_tipe_aksi_idx" ON "aktivitas_admin"("tipe_aksi");
CREATE INDEX IF NOT EXISTS "aktivitas_admin_target_entitas_target_id_idx" ON "aktivitas_admin"("target_entitas", "target_id");
CREATE INDEX IF NOT EXISTS "aktivitas_admin_created_at_idx" ON "aktivitas_admin"("created_at");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aktivitas_admin_admin_id_fkey') THEN
        ALTER TABLE "aktivitas_admin" ADD CONSTRAINT "aktivitas_admin_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laporan_reviewed_by_fkey') THEN
        ALTER TABLE "laporan" ADD CONSTRAINT "laporan_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'izin_cuti_reviewed_by_fkey') THEN
        ALTER TABLE "izin_cuti" ADD CONSTRAINT "izin_cuti_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
