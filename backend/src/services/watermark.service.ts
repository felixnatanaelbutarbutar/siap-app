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

const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Menambahkan watermark ke gambar dan embed metadata EXIF (jika didukung)
 * Output di-resize secara proporsional dengan lebar maksimal 800px.
 */
export const addWatermark = async (
  imageBuffer: Buffer,
  data: WatermarkData
): Promise<Buffer> => {
  try {
    const rawText = `${data.nama} | ${data.divisi} | ${data.tanggal_jam} | ${data.lat}, ${data.lng} | ${data.area_tugas}`;
    const safeText = escapeXml(rawText);

    const targetWidth = 800;

    const resizedPipeline = sharp(imageBuffer)
      .rotate()
      .resize(targetWidth, undefined, { withoutEnlargement: true });

    const resizedBuffer = await resizedPipeline.toBuffer({ resolveWithObject: true });
    const imgWidth = Math.max(1, resizedBuffer.info.width || targetWidth);
    const imgHeight = Math.max(1, resizedBuffer.info.height || 400);
    const barHeight = Math.min(40, Math.max(18, Math.floor(imgHeight * 0.25)));
    const fontSize = imgWidth < 400 ? 10 : 14;
    const textY = Math.floor(barHeight * 0.65);

    const svgOverlay = `
      <svg width="${imgWidth}" height="${barHeight}">
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" />
        <text x="12" y="${textY}" font-family="sans-serif" font-size="${fontSize}" fill="white">${safeText}</text>
      </svg>
    `;

    const processedBuffer = await sharp(resizedBuffer.data)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          gravity: 'southwest',
        },
      ])
      .withMetadata()
      .jpeg({ quality: 80 })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    logger.error('Error saat menambahkan watermark:', error);
    throw new Error('Gagal memproses foto.');
  }
};
