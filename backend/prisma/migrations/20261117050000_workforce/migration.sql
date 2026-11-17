-- AlterEnum
ALTER TYPE "StatusIzin" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "absensi" ADD COLUMN     "device_id" TEXT,
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "shift_id" TEXT;

-- AlterTable
ALTER TABLE "izin_cuti" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "work_dates" JSONB;

-- CreateTable
CREATE TABLE "registered_devices" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "registered_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_challenges" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "device_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_instances" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "tolerance" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SCHEDULE',
    "area" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_versions" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "effective_date" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "actor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_audits" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workforce_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_ledger" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "leave_id" TEXT,
    "actor_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_archives" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "rows" JSONB NOT NULL,
    "actor_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registered_devices_public_key_key" ON "registered_devices"("public_key");

-- CreateIndex
CREATE INDEX "registered_devices_staff_id_status_idx" ON "registered_devices"("staff_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_challenges_nonce_key" ON "device_challenges"("nonce");

-- CreateIndex
CREATE INDEX "device_challenges_expires_at_idx" ON "device_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "shift_instances_date_idx" ON "shift_instances"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_instances_staff_id_date_key" ON "shift_instances"("staff_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_versions_staff_id_effective_date_key" ON "schedule_versions"("staff_id", "effective_date");

-- CreateIndex
CREATE INDEX "workforce_audits_subject_id_created_at_idx" ON "workforce_audits"("subject_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_ledger_staff_id_year_idx" ON "leave_ledger"("staff_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_ledger_leave_id_year_kind_key" ON "leave_ledger"("leave_id", "year", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_archives_month_revision_key" ON "attendance_archives"("month", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_shift_id_jenis_key" ON "absensi"("shift_id", "jenis");
