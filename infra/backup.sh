#!/bin/bash
# Script untuk Backup PostgreSQL di SIAP App
# Harus dieksekusi di dalam server Production (NevaCloud) dengan akses ke Docker

BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="siap_db_backup_$DATE.sql"

# Buat direktori jika belum ada
mkdir -p "$BACKUP_DIR"

# Eksekusi pg_dump di dalam kontainer postgres
echo "Memulai backup database SIAP..."
docker exec -t infra-postgres-1 pg_dump -U siap_user siap_db > "$BACKUP_DIR/$FILENAME"

# Kompresi gzip
gzip "$BACKUP_DIR/$FILENAME"

echo "✅ Backup berhasil disimpan: $BACKUP_DIR/${FILENAME}.gz"

# Hapus backup yang lebih tua dari 7 hari
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -delete
echo "🗑️ Backup yang lebih tua dari 7 hari telah dihapus."
