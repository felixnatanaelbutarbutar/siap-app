import { open } from '@op-engineering/op-sqlite';

// Buka/buat database
export const db = open({ name: 'siap_offline.sqlite' });

export const initDatabase = () => {
  try {
    // Tabel absensi_offline untuk menyimpan absen yang gagal dikirim saat offline
    db.execute(`
      CREATE TABLE IF NOT EXISTS absensi_offline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jenis TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        foto_uri TEXT NOT NULL,
        waktu_lokal TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
      );
    `);
    console.log('Database SQLite (op-sqlite) berhasil diinisialisasi.');
  } catch (error) {
    console.error('Gagal inisialisasi SQLite:', error);
  }
};

export const insertAbsensiOffline = (jenis: string, lat: number, lng: number, foto_uri: string, waktu_lokal: string) => {
  try {
    db.execute(
      'INSERT INTO absensi_offline (jenis, lat, lng, foto_uri, waktu_lokal) VALUES (?, ?, ?, ?, ?)',
      [jenis, lat, lng, foto_uri, waktu_lokal]
    );
  } catch (error) {
    console.error('Insert absensi_offline gagal:', error);
  }
};

export const getPendingAbsensi = () => {
  try {
    // @ts-ignore
    const { rows } = db.execute('SELECT * FROM absensi_offline WHERE status = "pending"');
    if (!rows) return [];
    
    // op-sqlite rows.item() interface
    const results: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push(rows.item(i));
    }
    return results;
  } catch (error) {
    console.error('Ambil data pending gagal:', error);
    return [];
  }
};

export const markAbsensiSynced = (id: number) => {
  try {
    db.execute('UPDATE absensi_offline SET status = "synced" WHERE id = ?', [id]);
  } catch (error) {
    console.error('Update status synced gagal:', error);
  }
};
