import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';

// Kita gunakan localhost dan ADB Reverse untuk koneksi backend tanpa halangan Firewall PC
// Namun agar lebih aman di Emulator Android, kita set 10.0.2.2 khusus Android
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
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
    // Jika server merespon dengan 401 (Unauthorized), handle logout otomatis jika perlu
    if (error.response?.status === 401) {
      // Logic hapus token dsb bisa ditambahkan di sini dengan useAuthStore.getState().logout()
    }
    return Promise.reject(error);
  }
);
