import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import Geolocation from 'react-native-geolocation-service';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { API_BASE_URL } from './api';
import { queryClient } from './queryClient';
import {
  displayShiftReminderNow,
  displaySosAlertNotification,
  syncShiftReminders,
} from './shiftReminder';

class SocketService {
  private socket: Socket | null = null;
  private locationInterval: NodeJS.Timeout | null = null;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) return;
    if (this.socket?.connected) return;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(API_BASE_URL, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Socket terhubung:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket terputus');
    });

    this.socket.on('shift:reminder', (data: { title?: string; body?: string }) => {
      const title = data?.title || 'Shift Dimulai 1 Jam Lagi';
      const body = data?.body || 'Shift kerja Anda akan dimulai dalam 1 jam. Harap bersiap menuju lokasi tugas.';
      void displayShiftReminderNow(title, body);
    });

    this.socket.on('jadwal:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-hari-ini'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-mingguan'] });
      void syncShiftReminders({ force: true });
    });

    this.socket.on('sos:alert', (alert: any) => {
      const currentUser = useAuthStore.getState().user;
      if (!alert || (currentUser?.id && alert.staff_id === currentUser.id)) {
        return;
      }

      void displaySosAlertNotification(alert);

      const sender = alert.staff?.nama || 'Rekan Staff';
      const divisi = (alert.staff?.divisi || '').replace(/_/g, ' ');
      const area = alert.area_nama ? `\nArea: ${alert.area_nama}` : '';
      Alert.alert(
        `SOS DARURAT (${alert.kategori || 'DARURAT'})`,
        `Dari: ${sender}${divisi ? ` (${divisi})` : ''}${area}\n\nKeterangan:\n${alert.keterangan || 'Membutuhkan bantuan segera!'}`,
        [{ text: 'Mengerti', style: 'destructive' }]
      );
    });
  }

  disconnect() {
    this.stopLiveTracking();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  startLiveTracking() {
    if (!this.socket) this.connect();
    if (this.locationInterval) return; // Sudah berjalan

    console.log('Memulai Live Tracking GPS...');
    this.locationInterval = setInterval(async () => {
      // Check location permission silently
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!hasPermission) return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (this.socket && this.socket.connected) {
            // Sesuai dengan backend: location:update (mengirim lat, lng, akurasi)
            this.socket.emit('location:update', { lat: latitude, lng: longitude, akurasi: position.coords.accuracy || 0 });
          }
        },
        (error) => {
          console.log('Gagal ambil lokasi live:', error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }, 30000); // Setiap 30 detik
  }

  stopLiveTracking() {
    if (this.locationInterval) {
      console.log('Menghentikan Live Tracking GPS');
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  emitLocationNow(lat: number, lng: number, akurasi = 0) {
    if (!this.socket) this.connect();
    if (this.socket && this.socket.connected) {
      this.socket.emit('location:update', { lat, lng, akurasi });
    }
  }
}

export const socketService = new SocketService();
