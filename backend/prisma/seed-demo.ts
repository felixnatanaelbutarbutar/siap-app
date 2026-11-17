import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { uploadFile } from '../src/services/storage.service';
import { generateAndUploadBAST } from '../src/services/pdf.service';

const db = new PrismaClient();
const prefix = 'demo-video-';
const now = new Date();
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const midnight = new Date(`${day}T00:00:00+07:00`);
const at = (offset: number, hour = 0, minute = 0) => new Date(midnight.getTime() + (offset * 1440 + hour * 60 + minute) * 60000);
const dateOnly = (offset: number) => new Date(at(offset).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) + 'T00:00:00Z');
const id = (key: string) => prefix + key;

async function main() {
  const host = new URL(process.env.DATABASE_URL || '').hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host) || process.env.NODE_ENV === 'production') throw new Error('Seed demo hanya untuk database lokal development.');
  await db.$connect();
  // Synthetic evidence; never presented as a real field photograph or signature.
  const png = await sharp(Buffer.from(`<svg width="1000" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="600" fill="#102c25"/><rect x="50" y="50" width="900" height="500" rx="24" fill="#1e493e"/><text x="100" y="170" fill="#8ff0b7" font-size="40">SIAP / DATA DEMO</text><text x="100" y="290" fill="white" font-size="48">Dokumentasi operasional</text><text x="100" y="370" fill="white" font-size="26">Ilustrasi pengujian - bukan foto kejadian nyata</text><text x="100" y="455" fill="#8ff0b7" font-size="28">${day} | Keamanan - CS - Utility</text></svg>`)).png().toBuffer();
  const photo = await uploadFile(png, `${prefix}evidence.png`, 'image/png');
  const sign = await sharp(Buffer.from('<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="120" fill="white"/><text x="25" y="72" font-size="30" fill="#183d32">TTD SIMULASI DEMO</text></svg>')).png().toBuffer();
  const signature = await uploadFile(sign, `${prefix}signature.png`, 'image/png');
  const password_hash = await bcrypt.hash('DemoSiap2026!', 12);
  const groups = [
    { role: 'SATPAM', divisi: 'KEAMANAN', area: 'Menara Nusantara - Pos Utama', lat: -6.2088, lng: 106.8456, names: ['Arif Pratama', 'Dimas Saputra', 'Fajar Ramadhan', 'Yoga Saputra'], categories: ['PATROLI', 'PENJAGAAN', 'PENGAWALAN', 'INSIDEN', 'PEMELIHARAAN'] },
    { role: 'CS', divisi: 'CLEANING_SERVICE', area: 'Menara Nusantara - Lobby', lat: -6.2093, lng: 106.8460, names: ['Nadia Putri', 'Rina Anggraini', 'Maya Lestari', 'Intan Permata'], categories: ['KEBERSIHAN', 'PEMBERSIHAN_AREA', 'SANITASI_TOILET', 'PENGELOLAAN_SAMPAH', 'STOK_PERLENGKAPAN', 'LAIN_LAIN'] },
    { role: 'UTILITY', divisi: 'UTILITY', area: 'Menara Nusantara - Ruang Teknik', lat: -6.2100, lng: 106.8449, names: ['Rizky Maulana', 'Andi Setiawan', 'Bima Nugraha', 'Eko Purnomo'], categories: ['KEBERSIHAN', 'KERUSAKAN', 'PERBAIKAN', 'PEMERIKSAAN_RUTIN'] },
  ];
  const staff: any[] = [];
  const totals: Record<string, number> = {};
  await db.$transaction(async (tx) => {
    const put = async (model: string, key: string, data: any) => {
      totals[model] = (totals[model] || 0) + 1;
      return (tx as any)[model].upsert({ where: { id: id(key) }, create: { id: id(key), ...data }, update: data });
    };
    // These fixed IDs belong exclusively to the demo. Re-running refreshes only demo records.
    const admin = await put('staff', 'admin', { nik: '99000', nama: 'Admin Demo SIAP', role: 'ADMIN', divisi: 'MANAJEMEN', aktif: true, password_hash });
    await tx.pengaturanSistem.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton', toleransi_keterlambatan_menit: 15 } });
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const area = await put('areaTugas', `area-${g}`, { nama: `${group.area} (Demo)`, lat: group.lat, lng: group.lng, radius_meter: 300, aktif: true });
      for (let n = 0; n < 4; n++) {
        const index = g * 4 + n;
        const person = await put('staff', `staff-${index}`, { nik: String(99101 + index), nama: `${group.names[n]} (Demo)`, role: group.role, divisi: group.divisi, area_tugas_id: area.id, aktif: index !== 11, password_hash });
        staff.push(person);
        for (const hari of ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']) await put('jadwalKerja', `shift-${index}-${hari}`, { staff_id: person.id, hari, jam_masuk: '07:00', jam_keluar: '16:00', aktif: true });
        for (let d = -13; d <= 0; d++) {
          if (index === 11 || (d === 0 && index >= 9) || (d < 0 && (index - d) % 9 === 0)) continue;
          const times: [string, number, number][] = [['MASUK', 7, index % 4 === 1 ? 28 : 0], ['MULAI_ISTIRAHAT', 12, 0], ['SELESAI_ISTIRAHAT', 13, 0], ['KELUAR', 16, 5]];
          for (const [jenis, h, m] of times) {
            // Keep today's shifts open for the map, with one example currently on break.
            if (d === 0 && (jenis === 'KELUAR' || (index === 2 && jenis === 'SELESAI_ISTIRAHAT'))) continue;
            const waktu_server = at(d, h, m);
            if (waktu_server > now) continue;
            await put('absensi', `attendance-${index}-${d}-${jenis}`, { staff_id: person.id, jenis, waktu_server, foto_url: ['MASUK', 'KELUAR'].includes(jenis) ? photo : null, lat: group.lat + n * 0.00015, lng: group.lng + n * 0.0001, akurasi_gps: 5 + n, catatan: 'Simulasi video demo SIAP' });
          }
        }
      }
      for (let r = 0; r < group.categories.length * 2; r++) {
        const kategori = group.categories[r % group.categories.length];
        const status = ['SUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT'][r % 4];
        await put('laporan', `report-${g}-${r}`, { staff_id: staff[g * 4 + r % 3].id, divisi: group.divisi, kategori, judul: `${kategori.replace(/_/g, ' ')} - ${group.area} (Demo)`, deskripsi: `Dokumentasi simulasi kegiatan ${kategori.toLowerCase().replace(/_/g, ' ')} di ${group.area}. Petugas melakukan pemeriksaan sesuai checklist, mencatat kondisi lokasi, dan melaporkan tindak lanjut kepada koordinator. Data ini hanya untuk video demo.`, foto_urls: [photo], status, komentar_admin: status === 'APPROVED' ? 'Dokumentasi lengkap, tindak lanjut telah dicatat.' : status === 'REJECTED' ? 'Mohon lengkapi lokasi temuan dan hasil pemeriksaan ulang.' : null, created_at: at(-r - 1, 10, 15) });
      }
    }
    for (let n = 0; n < 3; n++) for (let d = -2; d <= 0; d++) for (const jam of [7, 10, 13, 16]) {
      if (at(d, jam) > now) continue;
      const data: any = { status_keamanan: ['AMAN', 'ADA_TEMUAN', 'PERLU_PERIKSA'][(n + jam) % 3], foto_url: photo, catatan: 'Demo: patroli area parkir, akses masuk, dan panel CCTV telah dilaksanakan.', created_at: at(d, jam) };
      await tx.laporanPerJam.upsert({ where: { staff_id_tanggal_jam: { staff_id: staff[n].id, tanggal: dateOnly(d), jam } }, create: { id: id(`hourly-${n}-${dateOnly(d).toISOString().slice(0, 10)}-${jam}`), staff_id: staff[n].id, tanggal: dateOnly(d), jam, ...data }, update: data });
      totals.laporanPerJam = (totals.laporanPerJam || 0) + 1;
    }
    for (let n = 0; n < 9; n++) {
      const offset = n < 3 ? 0 : n + 1;
      await put('izinCuti', `leave-${n}`, { staff_id: staff[n < 3 ? 9 + n % 2 : n].id, jenis: ['CUTI', 'IZIN', 'SAKIT'][n % 3], tanggal_mulai: dateOnly(offset), tanggal_selesai: dateOnly(offset + (n % 3)), keterangan: ['Cuti keluarga terencana (demo).', 'Keperluan administrasi keluarga (demo).', 'Istirahat dan pemulihan kesehatan (demo).'][n % 3], foto_url: n % 3 === 2 ? photo : null, status: ['APPROVED', 'PENDING', 'REJECTED'][n % 3], komentar_admin: n % 3 === 0 ? 'Disetujui. Pengganti shift sudah disiapkan.' : n % 3 === 2 ? 'Mohon melengkapi dokumen pendukung.' : null, created_at: at(-2, 9) });
    }
    for (let n = 0; n < 3; n++) await put('pengumuman', `announcement-${n}`, { admin_id: admin.id, tipe: ['INFO', 'PENTING', 'UPDATE'][n], judul: ['Briefing operasional awal pekan', 'Simulasi evakuasi dan pemeriksaan APAR', 'Pembaruan prosedur laporan harian'][n] + ' (Demo)', konten: ['Seluruh koordinator divisi mengikuti briefing pukul 07.00 di ruang operasional. Siapkan rekap shift dan kebutuhan perlengkapan.', 'Latihan evakuasi dilaksanakan Jumat pukul 10.00. Tim keamanan mengatur jalur keluar, CS membantu penghuni, dan utility memeriksa alat keselamatan.', 'Lengkapi laporan dengan kategori, dokumentasi, dan tindak lanjut. Pengajuan izin diproses melalui aplikasi SIAP.'][n], created_at: at(-n, 0) });
  }, { timeout: 60000 });
  // BAST uses the application's own renderer and storage service.
  for (let n = 0; n < 6; n++) {
    const base = n < 3 ? 0 : 8;
    const lama = staff[base], baru = staff[base + 1];
    const jenis = base === 0 ? 'PIKET' : 'PERALATAN';
    const selesai = n % 3 !== 0;
    const barang_list = [{ nama: base === 0 ? 'HT komunikasi' : 'Toolbox teknisi', kondisi: 'BAIK', catatan: 'Jumlah dan fungsi sesuai checklist demo.' }, { nama: base === 0 ? 'Senter patroli' : 'Multimeter', kondisi: n % 3 === 2 ? 'RUSAK' : 'BAIK', catatan: n % 3 === 2 ? 'Perlu penggantian baterai.' : 'Siap digunakan.' }];
    const catatan = 'SIMULASI DEMO. Inventaris diperiksa bersama sebelum pergantian shift.';
    const bast_pdf_url = selesai ? await generateAndUploadBAST({ id: id(`handover-${n}`), jenis, divisi: lama.divisi, tanggal: at(-n, 7), staff_lama_nama: lama.nama, staff_baru_nama: baru.nama, barang_list, catatan, ttd_lama_base64: sign.toString('base64'), ttd_baru_base64: sign.toString('base64') }) : null;
    const data: any = { staff_lama_id: lama.id, staff_baru_id: baru.id, jenis, shift_date: dateOnly(-n), barang_list, catatan, foto_urls: [photo], ttd_lama_url: signature, ttd_baru_url: selesai ? signature : null, bast_pdf_url, status: selesai ? 'SELESAI' : 'PENDING', created_at: at(-n, 0) };
    await db.serahTerima.upsert({ where: { id: id(`handover-${n}`) }, create: { id: id(`handover-${n}`), ...data }, update: data });
  }
  console.log(JSON.stringify({ tanggalJakarta: day, ...totals, serahTerima: 6, adminNik: '99000', staffNik: '99101–99112', password: 'DemoSiap2026!' }, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
