-- CreateEnum
CREATE TYPE "JenisIzin" AS ENUM ('IZIN', 'CUTI', 'SAKIT');

-- CreateEnum
CREATE TYPE "StatusIzin" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TipePengumuman" AS ENUM ('INFO', 'PENTING', 'UPDATE');

-- CreateTable
CREATE TABLE "izin_cuti" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "jenis" "JenisIzin" NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "foto_url" TEXT,
    "status" "StatusIzin" NOT NULL DEFAULT 'PENDING',
    "komentar_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "izin_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "tipe" "TipePengumuman" NOT NULL DEFAULT 'INFO',
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "izin_cuti_staff_id_idx" ON "izin_cuti"("staff_id");

-- CreateIndex
CREATE INDEX "izin_cuti_jenis_idx" ON "izin_cuti"("jenis");

-- CreateIndex
CREATE INDEX "izin_cuti_status_idx" ON "izin_cuti"("status");

-- CreateIndex
CREATE INDEX "izin_cuti_tanggal_mulai_tanggal_selesai_idx" ON "izin_cuti"("tanggal_mulai", "tanggal_selesai");

-- AddForeignKey
ALTER TABLE "izin_cuti" ADD CONSTRAINT "izin_cuti_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

