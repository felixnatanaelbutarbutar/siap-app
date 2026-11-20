import { getApiBaseUrl } from '../services/api';

export const updateStorageBase = (_serverUrl: string) => {
  // Disinkronkan dinamis melalui getApiBaseUrl()
};

export const getFileUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const clean = url.trim();

  // Jika sudah URL absolut (http/https)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    // Jika mengarah ke localhost:9000, alihkan ke proxy storage backend
    if (clean.includes(':9000/siap-storage/')) {
      const pathPart = clean.split(':9000/siap-storage/')[1];
      return `${getApiBaseUrl()}/storage/siap-storage/${pathPart}`;
    }
    return clean;
  }

  // Jika berupa path/key relatif MinIO
  const key = clean.replace(/^\/+/, '');
  return `${getApiBaseUrl()}/storage/siap-storage/${key}`;
};

export const getAvatarUrl = (url: string | null | undefined): string | null => {
  return getFileUrl(url);
};
