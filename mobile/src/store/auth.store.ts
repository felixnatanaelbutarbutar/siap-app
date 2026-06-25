import { create } from 'zustand';
import EncryptedStorage from 'react-native-encrypted-storage';

export type Role = 'SATPAM' | 'CS' | 'UTILITY' | 'ADMIN';
export type Divisi = 'KEAMANAN' | 'CUSTOMER_SERVICE' | 'UTILITY' | 'MANAJEMEN';

import { api } from '../services/api';

export interface UserData {
  id: string;
  nik: string;
  nama: string;
  role: Role;
  divisi: Divisi;
  foto_profil?: string | null;
}

interface AuthState {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (nik: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateFotoProfil: (foto_profil: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  login: async (nik, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { nik, password });
      if (res.data.success && res.data.data?.token) {
        const { token, user } = res.data.data;
        
        // Prevent ADMIN from logging into the mobile app
        if (user.role === 'ADMIN') {
          set({ isLoading: false, error: 'Akses ditolak. Akun Administrator hanya bisa login melalui Web Admin.' });
          return;
        }

        await EncryptedStorage.setItem('token', token);
        await EncryptedStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false, error: res.data.message || 'Login gagal.' });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat login.';
      set({ isLoading: false, error: msg });
    }
  },

  logout: async () => {
    try {
      await EncryptedStorage.removeItem('token');
      await EncryptedStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false, error: null });
    } catch (error) {
      console.error('Error removing auth data:', error);
    }
  },

  updateFotoProfil: async (foto_profil: string) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, foto_profil };
      EncryptedStorage.setItem('user', JSON.stringify(newUser)).catch(console.error);
      return { user: newUser };
    });
  },

  checkAuth: async () => {
    try {
      const token = await EncryptedStorage.getItem('token');
      const userStr = await EncryptedStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr) as UserData;
        set({ user, token, isLoading: false });

        // Fetch latest profile data silently
        try {
          // Set authorization header manually since the interceptor might not be ready
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/auth/me');
          if (res.data.success) {
            const latestUser = res.data.data;
            await EncryptedStorage.setItem('user', JSON.stringify(latestUser));
            set({ user: latestUser });
          }
        } catch (err) {
          console.error('Failed to fetch latest user data silently', err);
        }

      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
