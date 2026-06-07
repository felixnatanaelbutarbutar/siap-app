import { create } from 'zustand';
import EncryptedStorage from 'react-native-encrypted-storage';

export type Role = 'SATPAM' | 'CS' | 'UTILITY' | 'ADMIN';
export type Divisi = 'KEAMANAN' | 'CUSTOMER_SERVICE' | 'UTILITY' | 'MANAJEMEN';

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
  login: (userData: UserData, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (userData, token) => {
    try {
      await EncryptedStorage.setItem('token', token);
      await EncryptedStorage.setItem('user', JSON.stringify(userData));
      set({ user: userData, token, isLoading: false });
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  },

  logout: async () => {
    try {
      await EncryptedStorage.removeItem('token');
      await EncryptedStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false });
    } catch (error) {
      console.error('Error removing auth data:', error);
    }
  },

  checkAuth: async () => {
    try {
      const token = await EncryptedStorage.getItem('token');
      const userStr = await EncryptedStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr) as UserData;
        set({ user, token, isLoading: false });
      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
