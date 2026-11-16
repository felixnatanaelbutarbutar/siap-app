import { Platform } from 'react-native';

const STORAGE_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const STORAGE_BASE = `http://${STORAGE_HOST}:9000/siap-storage`;

export const getFileUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  let clean = url.trim();

  // Jika sudah URL absolut (http/https)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (Platform.OS === 'android' && clean.includes('localhost')) {
      return clean.replace(/localhost/g, '10.0.2.2');
    }
    return clean;
  }

  // Jika berupa path/key relatif MinIO
  const key = clean.replace(/^\/+/, '');
  return `${STORAGE_BASE}/${key}`;
};

export const getAvatarUrl = (url: string | null | undefined): string | null => {
  return getFileUrl(url);
};

