import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';

// Android USB connections use adb reverse (configured by npm run android).
export const API_BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (error.response?.status === 401) {
      // Penanganan token tidak aktif dikelola oleh store / layar login
    }
    return Promise.reject(error);
  }
);
