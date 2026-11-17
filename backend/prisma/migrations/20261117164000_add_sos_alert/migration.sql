-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'KEAMANAN',
    "keterangan" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "akurasi_gps" DOUBLE PRECISION,
    "area_nama" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "handled_by" TEXT,
    "handled_at" TIMESTAMP(3),
    "catatan_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "channel_token" TEXT NOT NULL,
    "user_agent" TEXT,
    "staff_id" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sos_alerts_staff_id_idx" ON "sos_alerts"("staff_id");

-- CreateIndex
CREATE INDEX "sos_alerts_status_idx" ON "sos_alerts"("status");

-- CreateIndex
CREATE INDEX "sos_alerts_created_at_idx" ON "sos_alerts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_channel_token_key" ON "web_push_subscriptions"("channel_token");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_aktif_idx" ON "web_push_subscriptions"("aktif");

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
