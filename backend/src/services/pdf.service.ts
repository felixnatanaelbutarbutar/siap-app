import PDFDocument from 'pdfkit';
import { uploadFile } from './storage.service';
import { format } from 'date-fns';
import { logger } from '../utils/logger';

interface BarangItem {
  nama: string;
  kondisi: string;
  catatan?: string;
}

export interface BASTData {
  id: string;
  jenis: string;
  divisi: string;
  tanggal: Date;
  staff_lama_nama: string;
  staff_baru_nama: string;
  barang_list: BarangItem[];
  catatan?: string;
  ttd_lama_base64: string; // base64 string
  ttd_baru_base64: string; // base64 string
}

/**
 * Generate Berita Acara Serah Terima (BAST) PDF
 * Upload PDF tersebut ke MinIO, dan return URL-nya.
 */
export const generateAndUploadBAST = async (data: BASTData): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        try {
          const pdfData = Buffer.concat(buffers);
          const filename = `bast/${data.id}/BAST_${data.jenis}_${Date.now()}.pdf`;
          
          // Upload ke MinIO
          const url = await uploadFile(pdfData, filename, 'application/pdf');
          resolve(url);
        } catch (uploadError) {
          logger.error('Gagal upload BAST PDF:', uploadError);
          reject(uploadError);
        }
      });

      // ─── Desain PDF BAST ──────────────────────────────────────────────────
      
      // Header
      doc.fontSize(16).font('Helvetica-Bold').text(`BERITA ACARA SERAH TERIMA ${data.jenis}`, { align: 'center' });
      doc.moveDown(1.5);
      
      // Info dasar
      doc.fontSize(11).font('Helvetica');
      doc.text(`Divisi           : ${data.divisi}`);
      doc.text(`Tanggal          : ${format(data.tanggal, 'dd MMMM yyyy, HH:mm:ss')}`);
      doc.text(`Staff Penyerah   : ${data.staff_lama_nama}`);
      doc.text(`Staff Penerima   : ${data.staff_baru_nama}`);
      doc.moveDown(1.5);

      // Tabel Barang
      doc.font('Helvetica-Bold').text('DAFTAR INVENTARIS / PERALATAN:', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const itemX = 50;
      const kondisiX = 250;
      const catatanX = 350;

      // Header Tabel
      doc.fontSize(10);
      doc.text('Nama Barang', itemX, tableTop);
      doc.text('Kondisi', kondisiX, tableTop);
      doc.text('Catatan', catatanX, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let currentY = tableTop + 20;

      data.barang_list.forEach((barang) => {
        // Beri warna merah jika barang Rusak/Hilang
        if (barang.kondisi === 'RUSAK' || barang.kondisi === 'HILANG') {
          doc.fillColor('red');
        } else {
          doc.fillColor('black');
        }

        doc.font('Helvetica').text(barang.nama, itemX, currentY);
        doc.text(barang.kondisi, kondisiX, currentY);
        doc.text(barang.catatan || '-', catatanX, currentY);
        
        currentY += 20;
      });

      doc.fillColor('black'); // Reset warna
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      doc.moveDown(2);

      // Catatan Tambahan
      if (data.catatan) {
        doc.y = currentY + 20;
        doc.font('Helvetica-Bold').text('Catatan Tambahan:');
        doc.font('Helvetica').text(data.catatan);
        doc.moveDown(2);
      } else {
        doc.y = currentY + 20;
      }

      // Tanda Tangan
      const ttdY = doc.y + 20;
      
      doc.text('Yang Menyerahkan,', 100, ttdY);
      doc.text('Yang Menerima,', 400, ttdY);

      // Embed TTD Lama (jika format base64 valid, contoh data:image/png;base64,...)
      try {
        const ttdLamaBuffer = Buffer.from(data.ttd_lama_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        doc.image(ttdLamaBuffer, 70, ttdY + 20, { width: 100, height: 60 });
      } catch (e) {
        doc.text('[Tanda Tangan Invalid]', 100, ttdY + 40);
      }

      // Embed TTD Baru
      try {
        const ttdBaruBuffer = Buffer.from(data.ttd_baru_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        doc.image(ttdBaruBuffer, 380, ttdY + 20, { width: 100, height: 60 });
      } catch (e) {
        doc.text('[Tanda Tangan Invalid]', 400, ttdY + 40);
      }

      doc.font('Helvetica-Bold');
      doc.text(data.staff_lama_nama, 100, ttdY + 90);
      doc.text(data.staff_baru_nama, 400, ttdY + 90);

      // Footer
      doc.fontSize(9).font('Helvetica-Oblique');
      doc.text('Dokumen digital oleh sistem SIAP - Berlaku sebagai alat bukti yang sah.', 50, 750, { align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('Error saat membuat PDF BAST:', error);
      reject(error);
    }
  });
};
