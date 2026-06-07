-- CreateEnum
CREATE TYPE "HariKerja" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'AHAD');

-- CreateTable
CREATE TABLE "jadwal_kerja" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "hari" "HariKerja" NOT NULL,
    "jam_masuk" TEXT NOT NULL,
    "jam_keluar" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_sistem" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "toleransi_keterlambatan_menit" INTEGER NOT NULL DEFAULT 15,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaturan_sistem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jadwal_kerja_staff_id_idx" ON "jadwal_kerja"("staff_id");

-- CreateIndex
CREATE INDEX "jadwal_kerja_hari_idx" ON "jadwal_kerja"("hari");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_kerja_staff_id_hari_key" ON "jadwal_kerja"("staff_id", "hari");

-- AddForeignKey
ALTER TABLE "jadwal_kerja" ADD CONSTRAINT "jadwal_kerja_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed singleton row for pengaturan_sistem
INSERT INTO "pengaturan_sistem" ("id", "toleransi_keterlambatan_menit", "updated_at")
VALUES ('singleton', 15, NOW())
ON CONFLICT ("id") DO NOTHING;
