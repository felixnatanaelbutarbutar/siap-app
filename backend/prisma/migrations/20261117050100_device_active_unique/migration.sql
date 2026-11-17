CREATE UNIQUE INDEX "registered_devices_one_approved_per_staff" ON "registered_devices" ("staff_id") WHERE "status" = 'APPROVED';
