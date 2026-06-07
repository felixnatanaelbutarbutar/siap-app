-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SATPAM', 'CS', 'UTILITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "Divisi" AS ENUM ('KEAMANAN', 'CUSTOMER_SERVICE', 'UTILITY', 'MANAJEMEN');

-- CreateEnum
CREATE TYPE "JenisAbsensi" AS ENUM ('MASUK', 'KELUAR', 'MULAI_ISTIRAHAT', 'SELESAI_ISTIRAHAT');

-- CreateEnum
CREATE TYPE "KategoriLaporan" AS ENUM ('PATROLI', 'PENJAGAAN', 'PENGAWALAN', 'INSIDEN', 'PEMELIHARAAN', 'KOMPLAIN', 'INFORMASI', 'PENGADUAN', 'LAIN_LAIN', 'KEBERSIHAN', 'KERUSAKAN', 'PERBAIKAN', 'PEMERIKSAAN_RUTIN');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StatusKeamanan" AS ENUM ('AMAN', 'ADA_TEMUAN', 'PERLU_PERIKSA');

-- CreateEnum
CREATE TYPE "JenisSerahTerima" AS ENUM ('PIKET', 'PERALATAN');

-- CreateEnum
CREATE TYPE "StatusSerahTerima" AS ENUM ('PENDING', 'SELESAI');

-- CreateTable
CREATE TABLE "area_tugas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius_meter" INTEGER NOT NULL DEFAULT 500,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SATPAM',
    "divisi" "Divisi" NOT NULL DEFAULT 'KEAMANAN',
    "area_tugas_id" TEXT,
    "fcm_token" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "jenis" "JenisAbsensi" NOT NULL,
    "foto_url" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "akurasi_gps" DOUBLE PRECISION,
    "waktu_server" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "divisi" "Divisi" NOT NULL,
    "kategori" "KategoriLaporan" NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "foto_urls" JSONB NOT NULL DEFAULT '[]',
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "komentar_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_perjam" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jam" INTEGER NOT NULL,
    "status_keamanan" "StatusKeamanan" NOT NULL DEFAULT 'AMAN',
    "foto_url" TEXT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laporan_perjam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serah_terima" (
    "id" TEXT NOT NULL,
    "staff_lama_id" TEXT NOT NULL,
    "staff_baru_id" TEXT NOT NULL,
    "jenis" "JenisSerahTerima" NOT NULL DEFAULT 'PIKET',
    "shift_date" DATE NOT NULL,
    "barang_list" JSONB NOT NULL DEFAULT '[]',
    "catatan" TEXT,
    "foto_urls" JSONB NOT NULL DEFAULT '[]',
    "ttd_lama_url" TEXT,
    "ttd_baru_url" TEXT,
    "bast_pdf_url" TEXT,
    "status" "StatusSerahTerima" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serah_terima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "token_jti" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_nik_key" ON "staff"("nik");

-- CreateIndex
CREATE INDEX "staff_area_tugas_id_idx" ON "staff"("area_tugas_id");

-- CreateIndex
CREATE INDEX "staff_aktif_idx" ON "staff"("aktif");

-- CreateIndex
CREATE INDEX "staff_role_idx" ON "staff"("role");

-- CreateIndex
CREATE INDEX "staff_divisi_idx" ON "staff"("divisi");

-- CreateIndex
CREATE INDEX "absensi_staff_id_idx" ON "absensi"("staff_id");

-- CreateIndex
CREATE INDEX "absensi_waktu_server_idx" ON "absensi"("waktu_server");

-- CreateIndex
CREATE INDEX "absensi_staff_id_waktu_server_idx" ON "absensi"("staff_id", "waktu_server");

-- CreateIndex
CREATE INDEX "laporan_staff_id_idx" ON "laporan"("staff_id");

-- CreateIndex
CREATE INDEX "laporan_divisi_idx" ON "laporan"("divisi");

-- CreateIndex
CREATE INDEX "laporan_status_idx" ON "laporan"("status");

-- CreateIndex
CREATE INDEX "laporan_staff_id_created_at_idx" ON "laporan"("staff_id", "created_at");

-- CreateIndex
CREATE INDEX "laporan_divisi_status_idx" ON "laporan"("divisi", "status");

-- CreateIndex
CREATE INDEX "laporan_perjam_staff_id_idx" ON "laporan_perjam"("staff_id");

-- CreateIndex
CREATE INDEX "laporan_perjam_tanggal_idx" ON "laporan_perjam"("tanggal");

-- CreateIndex
CREATE INDEX "laporan_perjam_staff_id_tanggal_idx" ON "laporan_perjam"("staff_id", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_perjam_staff_id_tanggal_jam_key" ON "laporan_perjam"("staff_id", "tanggal", "jam");

-- CreateIndex
CREATE INDEX "serah_terima_staff_lama_id_idx" ON "serah_terima"("staff_lama_id");

-- CreateIndex
CREATE INDEX "serah_terima_staff_baru_id_idx" ON "serah_terima"("staff_baru_id");

-- CreateIndex
CREATE INDEX "serah_terima_jenis_idx" ON "serah_terima"("jenis");

-- CreateIndex
CREATE INDEX "serah_terima_shift_date_idx" ON "serah_terima"("shift_date");

-- CreateIndex
CREATE INDEX "serah_terima_status_idx" ON "serah_terima"("status");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_token_jti_key" ON "revoked_tokens"("token_jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_token_jti_idx" ON "revoked_tokens"("token_jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_expired_at_idx" ON "revoked_tokens"("expired_at");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_area_tugas_id_fkey" FOREIGN KEY ("area_tugas_id") REFERENCES "area_tugas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_perjam" ADD CONSTRAINT "laporan_perjam_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serah_terima" ADD CONSTRAINT "serah_terima_staff_lama_id_fkey" FOREIGN KEY ("staff_lama_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serah_terima" ADD CONSTRAINT "serah_terima_staff_baru_id_fkey" FOREIGN KEY ("staff_baru_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
