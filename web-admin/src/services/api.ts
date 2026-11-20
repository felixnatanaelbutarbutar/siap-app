import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Jika diakses via Cloudflare Tunnel atau HTTPS, arahkan ke proxy /api Vite
    if (window.location.hostname.includes('trycloudflare.com') || window.location.protocol === 'https:') {
      return '/api';
    }
    // Jika diakses via IP lokal (misal 192.168.1.10:5173), gunakan IP host tersebut ke port 3000
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname.includes('trycloudflare.com') || window.location.protocol === 'https:'
        ? window.location.origin
        : `${window.location.protocol}//${window.location.hostname}:3000`)
    : 'http://localhost:3000');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
