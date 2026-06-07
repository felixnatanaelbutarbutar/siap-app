import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

class SocketService {
  private socket: Socket | null = null;
  private locationInterval: NodeJS.Timeout | null = null;

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) return;

    // Menggunakan localhost karena ADB Reverse sudah aktif
    this.socket = io('http://localhost:3000', {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Socket terhubung:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket terputus');
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
}

export const socketService = new SocketService();
