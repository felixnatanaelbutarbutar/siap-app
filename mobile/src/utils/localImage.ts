import ReactNativeBlobUtil from 'react-native-blob-util';

export const localImageUri = (path: string): string => {
  if (/^(file|content):\/\//.test(path)) return path;
  if (path.startsWith('/')) return `file://${path}`;
  throw new Error('Lokasi file foto tidak valid. Silakan ambil foto ulang.');
};

export const checkedImageUri = async (path: string): Promise<string> => {
  const uri = localImageUri(path);
  if (uri.startsWith('file://') && !(await ReactNativeBlobUtil.fs.exists(decodeURI(uri.slice(7))))) {
    throw new Error('File foto sudah tidak tersedia. Silakan ambil foto ulang.');
  }
  return uri;
};
