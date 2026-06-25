import { Platform } from 'react-native';

export const getAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Jika URL menyimpan 'localhost' dari MinIO lokal (di backend), kita replace menjadi '10.0.2.2'
  // agar emulator Android bisa mengaksesnya.
  if (Platform.OS === 'android' && url.includes('localhost')) {
    return url.replace('localhost', '10.0.2.2');
  }
  
  return url;
};
