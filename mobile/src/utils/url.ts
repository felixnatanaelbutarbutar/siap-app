const STORAGE_BASE = 'http://localhost:9000/siap-storage';

export const getFileUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const clean = url.trim();

  // Jika sudah URL absolut (http/https)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Jika berupa path/key relatif MinIO (didukung via adb reverse tcp:9000 tcp:9000)
  const key = clean.replace(/^\/+/, '');
  return `${STORAGE_BASE}/${key}`;
};

export const getAvatarUrl = (url: string | null | undefined): string | null => {
  return getFileUrl(url);
};

