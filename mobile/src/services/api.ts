import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { updateStorageBase } from '../utils/url';

export const DEFAULT_SERVER_URL = 'http://192.168.1.10:3000';
export let API_BASE_URL = DEFAULT_SERVER_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const getApiBaseUrl = (): string => API_BASE_URL;

export const initApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await EncryptedStorage.getItem('custom_server_url');
    if (saved && saved.trim()) {
      API_BASE_URL = saved.trim();
      api.defaults.baseURL = API_BASE_URL;
      updateStorageBase(API_BASE_URL);
      return API_BASE_URL;
    }
  } catch {}
  API_BASE_URL = DEFAULT_SERVER_URL;
  api.defaults.baseURL = API_BASE_URL;
  updateStorageBase(API_BASE_URL);
  return API_BASE_URL;
};

export const setApiBaseUrl = async (url: string): Promise<string> => {
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  if (!clean.includes(':', clean.indexOf('://') + 3) && !clean.includes('.trycloudflare.com') && !clean.includes('.loca.lt')) {
    clean = `${clean}:3000`;
  }
  API_BASE_URL = clean;
  api.defaults.baseURL = clean;
  await EncryptedStorage.setItem('custom_server_url', clean);
  updateStorageBase(clean);
  return clean;
};

// Initialize immediately
void initApiBaseUrl();

api.interceptors.request.use(
  async (config) => {
    config.baseURL = API_BASE_URL;
    const token = await EncryptedStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Penanganan token tidak aktif dikelola oleh store / layar login
    }
    return Promise.reject(error);
  }
);
