import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import MockLocationDetector from 'react-native-mock-location-detector';
import ImageMarker from 'react-native-image-marker';
import { Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuthStore } from '../store/auth.store';

interface Props {
  jenis: 'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT' | null;
  onClose: () => void;
  onPhotoTaken: (uri: string, lat: number, lng: number) => void;
}

export const CameraView = ({ jenis, onClose, onPhotoTaken }: Props) => {
  const device = useCameraDevice('front');
  const camera = useRef<Camera>(null);
  const user = useAuthStore(state => state.user);

  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermission();
      setHasPermission(cameraStatus === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (!camera.current) return;
    setIsProcessing(true);

    try {
      // 1. Request Permission Terlebih Dahulu (Mock Detector butuh izin lokasi)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        const fineGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (!fineGranted && !coarseGranted) {
          Alert.alert('Izin Ditolak', 'Izin lokasi wajib diberikan untuk melakukan absen.');
          setIsProcessing(false);
          return;
        }
      }

      // 2. Cek Mock Location
      const isMock = await MockLocationDetector.checkMockLocationProvider();
      if (isMock) {
        Alert.alert('Fake GPS Terdeteksi', 'Anda terdeteksi menggunakan aplikasi lokasi palsu. Harap matikan dan coba lagi.');
        setIsProcessing(false);
        return;
      }

      // 3. Ambil Foto
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'speed',
        flash: 'off',
      });

      Geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            // 4. Tambah Watermark (Native Layer)
            const waktuLokal = format(new Date(), 'dd-MM-yyyy HH:mm:ss');
            const watermarkText = `${user?.nama || 'Unknown'} | ${user?.divisi || ''}\n${waktuLokal}\nLat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
            
            const imageUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
            
            const markedImagePath = await ImageMarker.markText({
              backgroundImage: {
                src: imageUri,
                scale: 1,
              },
              watermarkTexts: [
                {
                  text: watermarkText,
                  positionOptions: {
                    X: 20,
                    Y: 20,
                  },
                  style: {
                    color: '#FF0000',
                    fontSize: 44,
                  },
                },
              ],
              quality: 80,
            });

            // 5. Kembalikan URL yang sudah dimanipulasi
            onPhotoTaken(markedImagePath, lat, lng);
          } catch (markerError) {
            console.log('Watermark error:', markerError);
            Alert.alert('Error', 'Gagal menambahkan watermark pada foto.');
            setIsProcessing(false);
          }
        },
        (error) => {
          console.log('Geolocation error:', error);
          Alert.alert('Gagal Mendapat Lokasi', 'Pastikan GPS Anda aktif dan beri izin lokasi ke aplikasi SIAP.');
          setIsProcessing(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

    } catch (e) {
      console.log('Capture error:', e);
      setIsProcessing(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Aplikasi tidak memiliki izin kamera.</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: 'white' }}>Tutup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Kamera tidak ditemukan pada perangkat ini.</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: 'white' }}>Tutup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.overlayTop}>
        <Text style={styles.overlayText}>Selfie Absensi - {jenis}</Text>
      </View>

      <View style={styles.overlayBottom}>
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={isProcessing}>
          {isProcessing ? <ActivityIndicator color="#fff" /> : <View style={styles.captureInner} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isProcessing}>
          <Text style={{ color: 'white' }}>Batal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
  },
  closeBtn: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#111111',
    borderRadius: 8,
  },
  overlayTop: {
    position: 'absolute',
    top: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  cancelBtn: {
    padding: 10,
  }
});
