import sharp from 'sharp';
import { logger } from '../utils/logger';

export interface WatermarkData {
  nama: string;
  divisi: string;
  tanggal_jam: string;
  lat: number;
  lng: number;
  area_tugas: string;
}

/**
 * Menambahkan watermark ke gambar dan embed metadata EXIF (jika didukung)
 * Output di-resize secara proporsional dengan lebar maksimal 800px.
 */
export const addWatermark = async (
  imageBuffer: Buffer,
  data: WatermarkData
): Promise<Buffer> => {
  try {
    const text = `${data.nama} | ${data.divisi} | ${data.tanggal_jam} | ${data.lat}, ${data.lng} | ${data.area_tugas}`;
    
    // Tentukan lebar standar (800) untuk hasil gambar
    const targetWidth = 800;

    // SVG untuk watermark visual (pojok kiri bawah)
    // Tinggi bar watermark 30px dengan font 14px dan background hitam semi-transparan
    const svgOverlay = `
      <svg width="${targetWidth}" height="40">
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" />
        <text x="15" y="25" font-family="sans-serif" font-size="14" fill="white">${text}</text>
      </svg>
    `;

    const processedBuffer = await sharp(imageBuffer)
      .resize(targetWidth, undefined, { withoutEnlargement: true })
      // Pertahankan orientasi EXIF asli agar foto tidak miring
      .rotate() 
      // Terapkan watermark visual
      .composite([
        {
          input: Buffer.from(svgOverlay),
          gravity: 'southwest',
        },
      ])
      // Mempertahankan metadata EXIF jika ada (sharp > v0.33)
      .withMetadata()
      .jpeg({ quality: 80 })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    logger.error('Error saat menambahkan watermark:', error);
    throw new Error('Gagal memproses foto.');
  }
};
