import {saveOfflineEvidence} from '../../services/offlineEvidence';
import { attendanceProof } from '../../services/device';
import { DeviceRegistration } from '../../components/DeviceRegistration';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, Modal, ScrollView, SafeAreaView, TouchableOpacity, Animated, RefreshControl, PermissionsAndroid, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import notifee, { TriggerType, IntervalTrigger, TimeUnit } from '@notifee/react-native';
import Geolocation from 'react-native-geolocation-service';
import MockLocationDetector from 'react-native-mock-location-detector';
import Toast from 'react-native-toast-message';

import { CameraView } from '../../components/CameraView';
import { validateWorkArea, hitungJarakMeter, GeofenceError } from '../../utils/geofence';
import { cancelTodayShiftReminder } from '../../services/shiftReminder';
import { setupLaporan6JamReminders, cancelAllLaporanReminders } from '../../services/laporanReminder';
import { socketService } from '../../services/socket';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type LocationStatus = 'idle' | 'inside' | 'outside' | 'low_accuracy' | 'mock' | 'no_area' | 'permission_denied' | 'error';

interface LiveLocationInfo {
  lat: number;
  lng: number;
  accuracy: number;
  distance: number | null;
  updatedAt: Date;
}

const formatDistance = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '-';
  const rounded = Math.round(meters);
  if (rounded >= 1000) return `${(rounded / 1000).toFixed(2).replace('.', ',')} km`;
  return `${rounded} m`;
};

const JENIS_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  MASUK:            { icon: 'login-variant',   color: '#087F5B', bg: '#e8f0e4', label: 'Masuk' },
  KELUAR:           { icon: 'logout-variant',  color: '#ba1a1a', bg: '#ffdad6', label: 'Keluar' },
  MULAI_ISTIRAHAT:  { icon: 'coffee-outline',  color: '#c77800', bg: '#ffefd4', label: 'Mulai Istirahat' },
  SELESAI_ISTIRAHAT:{ icon: 'coffee',          color: '#087F5B', bg: '#e8f0e4', label: 'Selesai Istirahat' },
};

export const AbsensiScreen = () => {
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const queryClient = useQueryClient();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [jenisAbsenTerpilih, setJenisAbsenTerpilih] = useState<'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT' | null>(null);
  const [isRefreshingPage, setIsRefreshingPage] = useState(false);

  // Live GPS & Geofence state
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationInfo, setLocationInfo] = useState<LiveLocationInfo | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequestInFlight = useRef(false);

  const pageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [pageAnim]);

  const { data: absensiHariIni, isLoading, refetch: refetchAbsensi } = useQuery({
    queryKey: ['absensi', 'hari-ini'],
    queryFn: async () => {
      const res = await api.get('/absensi/hari-ini');
      return res.data.data;
    },
  });

  const refreshLocation = useCallback(async (options?: { syncArea?: boolean; showToast?: boolean; requestPermission?: boolean }) => {
    if (locationRequestInFlight.current) return;
    locationRequestInFlight.current = true;
    setIsRefreshingLocation(true);
    setLocationError(null);

    try {
      if (Platform.OS === 'android') {
        const hasFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        const hasCoarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        if (!hasFine && !hasCoarse) {
          if (options?.requestPermission) {
            const granted = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            const fineOk = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
            const coarseOk = granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
            if (!fineOk && !coarseOk) {
              setLocationStatus('permission_denied');
              setLocationError('Izin lokasi belum diberikan. Aktifkan izin lokasi di pengaturan HP.');
              return;
            }
          } else {
            setLocationStatus('permission_denied');
            setLocationError('Izin lokasi diperlukan. Ketuk Perbarui untuk mengaktifkan GPS.');
            return;
          }
        }
      }

      const [latestUser, isMock, position] = await Promise.all([
        options?.syncArea ? refreshUser() : Promise.resolve(useAuthStore.getState().user),
        MockLocationDetector.checkMockLocationProvider().catch(() => false),
        new Promise<any>((resolve, reject) =>
          Geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
            forceRequestLocation: true,
            showLocationDialog: true,
          })
        ),
      ]);

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : 0;
      const area = latestUser?.area_tugas;

      socketService.emitLocationNow(lat, lng, accuracy);

      if (isMock || position.mocked) {
        setLocationInfo({ lat, lng, accuracy, distance: null, updatedAt: new Date() });
        setLocationStatus('mock');
        setLocationError('Lokasi palsu (Fake GPS) terdeteksi. Matikan lalu perbarui lokasi.');
        if (options?.showToast) {
          Toast.show({ type: 'error', text1: 'Fake GPS Terdeteksi', text2: 'Matikan aplikasi lokasi palsu lalu coba lagi.' });
        }
        return;
      }

      if (!area || !Number.isFinite(area.lat) || !Number.isFinite(area.lng) || !Number.isFinite(area.radius_meter)) {
        setLocationInfo({ lat, lng, accuracy, distance: null, updatedAt: new Date() });
        setLocationStatus('no_area');
        setLocationError('Koordinat area tugas belum diatur oleh admin.');
        return;
      }

      const distance = hitungJarakMeter(lat, lng, area.lat!, area.lng!);
      setLocationInfo({ lat, lng, accuracy, distance, updatedAt: new Date() });

      if (distance > area.radius_meter!) {
        setLocationStatus('outside');
        if (options?.showToast) {
          Toast.show({
            type: 'error',
            text1: 'Di Luar Radius Kantor',
            text2: `Jarak ${formatDistance(distance)} dari ${area.nama} (batas ${area.radius_meter} m).`,
          });
        }
      } else if (accuracy > 50) {
        setLocationStatus('low_accuracy');
        if (options?.showToast) {
          Toast.show({
            type: 'info',
            text1: 'Sinyal GPS Kurang Akurat',
            text2: `Akurasi ±${accuracy} m (maks 50 m). Pindah ke tempat lebih terbuka lalu perbarui.`,
          });
        }
      } else {
        setLocationStatus('inside');
        if (options?.showToast) {
          Toast.show({
            type: 'success',
            text1: 'Lokasi Tersinkronisasi',
            text2: `Anda berada di dalam radius ${area.nama} (${formatDistance(distance)} · ±${accuracy} m).`,
          });
        }
      }
    } catch (err: any) {
      setLocationStatus('error');
      const msg = err?.code === 1
        ? 'Izin lokasi ditolak. Aktifkan izin lokasi aplikasi SIAP.'
        : err?.code === 2
        ? 'GPS tidak aktif. Nyalakan Layanan Lokasi (GPS) di HP Anda.'
        : err?.code === 3
        ? 'Waktu pencarian GPS habis. Coba di area terbuka lalu ketuk Perbarui.'
        : 'Gagal mendapatkan lokasi terbaru. Pastikan GPS aktif lalu coba lagi.';
      setLocationError(msg);
      if (options?.showToast) {
        Toast.show({ type: 'error', text1: 'Gagal Memperbarui Lokasi', text2: msg });
      }
    } finally {
      setIsRefreshingLocation(false);
      locationRequestInFlight.current = false;
    }
  }, [refreshUser]);

  // Otomatis sinkronkan lokasi & data absensi setiap kali membuka tab Absensi
  useFocusEffect(
    useCallback(() => {
      void refetchAbsensi();
      void refreshLocation({ syncArea: true, showToast: false, requestPermission: false });
    }, [refetchAbsensi, refreshLocation])
  );

  const handlePullRefresh = async () => {
    setIsRefreshingPage(true);
    try {
      await Promise.all([
        refetchAbsensi(),
        refreshLocation({ syncArea: true, showToast: true, requestPermission: true }),
      ]);
    } finally {
      setIsRefreshingPage(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (payload: { jenis: string, lat: number, lng: number, foto_uri: string, capturedAt?: number }) => {
      const proof=await attendanceProof(payload.jenis,payload.foto_uri,payload.capturedAt);
      payload={...payload,lat:proof.lat,lng:proof.lng};
      validateWorkArea(payload.lat, payload.lng, useAuthStore.getState().user?.area_tugas);
      const endpointMap: Record<string, string> = {
        'MASUK': '/absensi/masuk',
        'KELUAR': '/absensi/keluar',
        'MULAI_ISTIRAHAT': '/absensi/mulai-istirahat',
        'SELESAI_ISTIRAHAT': '/absensi/selesai-istirahat',
      };
      const endpoint = endpointMap[payload.jenis] || '/absensi/masuk';

      if (payload.jenis === 'MASUK' || payload.jenis === 'KELUAR') {
        const formData = new FormData();
        formData.append('lat', payload.lat.toString());
        formData.append('lng', payload.lng.toString());
        
        const filename = payload.foto_uri.split('/').pop() || 'photo.jpg';
        const finalUri = payload.foto_uri.startsWith('file://') ? payload.foto_uri : `file://${payload.foto_uri}`;
        
        formData.append('foto', {
          uri: finalUri,
          name: filename,
          type: 'image/jpeg',
        } as any);

        const res = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data', 'X-Device-Proof': proof.header },
        });
        return res.data;
      } else {
        const res = await api.post(endpoint, {
          lat: payload.lat,
          lng: payload.lng,
        }, {headers:{'X-Device-Proof':proof.header}});
        return res.data;
      }
    },
    onSuccess: async (_data, variables) => {
      Alert.alert('SUKSES', 'Absensi berhasil terkirim!');
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
      if (variables.jenis === 'MASUK') {
        void cancelTodayShiftReminder();
      }
      if (user?.role === 'SATPAM') {
        if (variables.jenis === 'MASUK') {
          void setupLaporan6JamReminders(new Date());
        } else if (variables.jenis === 'KELUAR') {
          void cancelAllLaporanReminders();
        }
      }
    },
    onError: async (error: any, variables) => {
      if (error instanceof GeofenceError) { Alert.alert(error.title, error.message); return; }
      const radiusMessage = error.response?.data?.message || '';
      if (error.response && /radius|di luar area|jangkauan/i.test(radiusMessage)) {
        Alert.alert('Gagal Absen - Di Luar Jangkauan', radiusMessage); return;
      }
      console.log('Error absen API:', error);
      if (!error?.response) {
        if(error.isAxiosError && user?.id) {
          try {await saveOfflineEvidence(user.id,variables);Alert.alert('Menunggu Verifikasi','Bukti disimpan di HP. Setelah terkirim, admin perlu memverifikasi absensi ini. Periksa riwayat sebelum mengulang.');}
          catch(e:any){Alert.alert('Belum Tersimpan',e.message||'Gagal menyimpan bukti offline.');}
        } else Alert.alert('Absensi Belum Terkonfirmasi', error.message || 'Koneksi terputus. Periksa riwayat sebelum mencoba lagi.');
        queryClient.invalidateQueries({queryKey:['absensi']});
        return;
      }

      const serverMsg =
        error.response?.data?.message || 'Gagal mengirim absensi. Silakan periksa kembali dan coba lagi.';
      Alert.alert('GAGAL ABSEN', serverMsg);
    }
  });

  const handleBukaKamera = (jenis: 'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT') => {
    if (locationStatus === 'mock') {
      Alert.alert(
        'Fake GPS Terdeteksi',
        'Matikan aplikasi lokasi palsu terlebih dahulu lalu perbarui lokasi Anda.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Perbarui Lokasi', onPress: () => void refreshLocation({ syncArea: true, showToast: true, requestPermission: true }) },
        ]
      );
      return;
    }

    if (locationStatus === 'outside' && user?.area_tugas) {
      Alert.alert(
        'Di Luar Radius Penugasan',
        `Lokasi terakhir Anda berjarak ${formatDistance(locationInfo?.distance)} dari ${user.area_tugas.nama} (batas maksimal ${user.area_tugas.radius_meter} m).\n\nJika Anda sudah mendekati kantor, tekan "Perbarui Lokasi" untuk menyinkronkan GPS terbaru.`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Perbarui Lokasi', onPress: () => void refreshLocation({ syncArea: true, showToast: true, requestPermission: true }) },
        ]
      );
      return;
    }

    if (locationStatus === 'low_accuracy' && locationInfo) {
      Alert.alert(
        'Akurasi GPS Belum Optimal',
        `Akurasi GPS saat ini ±${locationInfo.accuracy} m (syarat maksimal 50 m). Sebaiknya pindah ke tempat terbuka dan perbarui lokasi dulu.`,
        [
          { text: 'Perbarui Lokasi', onPress: () => void refreshLocation({ syncArea: true, showToast: true, requestPermission: true }) },
          {
            text: 'Lanjut Ambil Foto',
            onPress: () => {
              setJenisAbsenTerpilih(jenis);
              setIsCameraOpen(true);
            },
          },
        ]
      );
      return;
    }

    setJenisAbsenTerpilih(jenis);
    setIsCameraOpen(true);
  };

  const handleSelesaiFoto = async (foto_uri: string, lat: number, lng: number, capturedAt?: number) => {
    try { validateWorkArea(lat, lng, useAuthStore.getState().user?.area_tugas); }
    catch (error) { if (error instanceof GeofenceError) Alert.alert(error.title, error.message); return; }
    setIsCameraOpen(false);
    if (jenisAbsenTerpilih) {
      mutation.mutate({ jenis: jenisAbsenTerpilih, lat, lng, foto_uri, capturedAt });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#161d16" />
      </View>
    );
  }

  const sudahMasuk = absensiHariIni?.some((a: any) => a.jenis === 'MASUK');
  const sudahKeluar = absensiHariIni?.some((a: any) => a.jenis === 'KELUAR');
  const sedangIstirahat = absensiHariIni?.some((a: any) => a.jenis === 'MULAI_ISTIRAHAT') && !absensiHariIni?.some((a: any) => a.jenis === 'SELESAI_ISTIRAHAT');

  const statusBg = sudahKeluar ? '#e8f0e4' : sedangIstirahat ? '#ffefd4' : sudahMasuk ? '#e8f0e4' : '#e8f0e4';
  const statusDot = sudahKeluar ? '#515f74' : sedangIstirahat ? '#c77800' : sudahMasuk ? '#007d48' : '#087F5B';

  const locTheme = (() => {
    if (isRefreshingLocation) {
      return {
        bg: '#ffffff',
        border: '#dce5d9',
        iconBg: '#e8f0e4',
        icon: 'crosshairs-gps',
        color: '#087F5B',
        title: 'MENYINKRONKAN LOKASI...',
        desc: 'Mengambil sinyal GPS akurat & koordinat kantor terbaru.',
      };
    }
    switch (locationStatus) {
      case 'inside':
        return {
          bg: '#ffffff',
          border: '#b7e0c2',
          iconBg: '#d8f3e0',
          icon: 'map-marker-check',
          color: '#006e2f',
          title: 'DALAM RADIUS KANTOR',
          desc: `Siap absen di ${user?.area_tugas?.nama || 'Area Tugas'} (batas ${user?.area_tugas?.radius_meter || 0} m).`,
        };
      case 'outside':
        return {
          bg: '#fff5f5',
          border: '#f3c1c1',
          iconBg: '#ffdad6',
          icon: 'map-marker-off',
          color: '#ba1a1a',
          title: 'DI LUAR RADIUS KANTOR',
          desc: `Anda berada di luar batas ${user?.area_tugas?.radius_meter || 0} m dari ${user?.area_tugas?.nama || 'Area Tugas'}. Jika sudah dekat, tekan Perbarui.`,
        };
      case 'low_accuracy':
        return {
          bg: '#fffaf0',
          border: '#f3d9a4',
          iconBg: '#ffefd4',
          icon: 'satellite-variant',
          color: '#c77800',
          title: 'AKURASI GPS LEMAH',
          desc: `Akurasi ±${locationInfo?.accuracy ?? 0} m (batas maks 50 m). Pindah ke area terbuka lalu tekan Perbarui.`,
        };
      case 'mock':
        return {
          bg: '#fff5f5',
          border: '#f3c1c1',
          iconBg: '#ffdad6',
          icon: 'alert-octagon',
          color: '#ba1a1a',
          title: 'FAKE GPS TERDETEKSI',
          desc: locationError || 'Matikan aplikasi lokasi palsu lalu tekan Perbarui.',
        };
      case 'permission_denied':
      case 'error':
      case 'no_area':
        return {
          bg: '#fffaf0',
          border: '#f3d9a4',
          iconBg: '#ffefd4',
          icon: 'map-marker-alert',
          color: '#c77800',
          title: locationStatus === 'no_area' ? 'AREA BELUM DIATUR' : 'LOKASI BELUM TERSINKRON',
          desc: locationError || 'Tekan Perbarui untuk mengambil lokasi GPS terbaru.',
        };
      default:
        return {
          bg: '#ffffff',
          border: '#dce5d9',
          iconBg: '#e8f0e4',
          icon: 'crosshairs-gps',
          color: '#3d4a3d',
          title: 'CEK LOKASI TERKINI',
          desc: 'Tekan Perbarui untuk mengecek jarak ke area tugas.',
        };
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingPage}
            onRefresh={handlePullRefresh}
            tintColor="#087F5B"
            colors={['#087F5B']}
          />
        }
      >
        <Animated.View style={{ opacity: pageAnim }}>

        <DeviceRegistration />
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>ABSENSI HARI INI</Text>
          <Text style={styles.dateSubtitle}>{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id }).toUpperCase()}</Text>
        </View>

        {/* STATUS BAR */}
        <View style={[styles.statusSection, { backgroundColor: statusBg }]}>
          <View style={styles.statusLabelRow}>
            <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
            <Text style={styles.statusLabel}>STATUS SHIFT</Text>
          </View>
          {sudahKeluar ? (
            <Text style={[styles.statusValue, { color: '#161d16' }]}>SELESAI SHIFT</Text>
          ) : sedangIstirahat ? (
            <Text style={[styles.statusValue, { color: '#c77800' }]}>SEDANG ISTIRAHAT</Text>
          ) : sudahMasuk ? (
            <Text style={[styles.statusValue, { color: '#007d48' }]}>SHIFT AKTIF</Text>
          ) : (
            <Text style={[styles.statusValue, { color: '#087F5B' }]}>BELUM ABSEN</Text>
          )}
        </View>

        {/* KARTU LOKASI & REFRESH GPS TERKINI */}
        <View style={styles.locationCardWrapper}>
          <View style={[styles.locationCard, { backgroundColor: locTheme.bg, borderColor: locTheme.border }]}>
            <View style={styles.locationCardTop}>
              <View style={[styles.locationIconWrap, { backgroundColor: locTheme.iconBg }]}>
                {isRefreshingLocation ? (
                  <ActivityIndicator size="small" color={locTheme.color} />
                ) : (
                  <Icon name={locTheme.icon} size={22} color={locTheme.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationStatusTitle, { color: locTheme.color }]}>{locTheme.title}</Text>
                <Text style={styles.locationStatusArea} numberOfLines={1}>
                  {user?.area_tugas?.nama || 'Area Tugas Belum Diatur'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isRefreshingLocation}
                onPress={() => void refreshLocation({ syncArea: true, showToast: true, requestPermission: true })}
                style={[styles.refreshLocBtn, isRefreshingLocation && styles.refreshLocBtnDisabled]}
              >
                <Icon name="refresh" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                <Text style={styles.refreshLocBtnText}>
                  {isRefreshingLocation ? 'Cek...' : 'Perbarui'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.locationDesc}>{locTheme.desc}</Text>

            <View style={styles.locationMetricsRow}>
              <View style={styles.locationMetricBox}>
                <Text style={styles.locationMetricLabel}>JARAK</Text>
                <Text style={[styles.locationMetricValue, locationStatus === 'outside' && { color: '#ba1a1a' }]}>
                  {formatDistance(locationInfo?.distance)}
                </Text>
              </View>
              <View style={styles.locationMetricDivider} />
              <View style={styles.locationMetricBox}>
                <Text style={styles.locationMetricLabel}>AKURASI GPS</Text>
                <Text style={[styles.locationMetricValue, locationStatus === 'low_accuracy' && { color: '#c77800' }]}>
                  {locationInfo ? `±${locationInfo.accuracy} m` : '-'}
                </Text>
              </View>
              <View style={styles.locationMetricDivider} />
              <View style={styles.locationMetricBox}>
                <Text style={styles.locationMetricLabel}>SINKRON</Text>
                <Text style={styles.locationMetricValue}>
                  {locationInfo ? format(locationInfo.updatedAt, 'HH:mm:ss') : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionContainer}>
          {!sudahMasuk && !sudahKeluar && (
            <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#087F5B' }]} onPress={() => handleBukaKamera('MASUK')}>
              <Icon name="login-variant" size={20} color="#ffffff" style={{ marginRight: 10 }} />
              <Text style={styles.pillButtonText}>ABSEN MASUK</Text>
            </TouchableOpacity>
          )}

          {sudahMasuk && !sudahKeluar && !sedangIstirahat && (
            <>
              <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#e8f0e4', borderWidth: 1, borderColor: '#dce5d9' }]} onPress={() => handleBukaKamera('MULAI_ISTIRAHAT')}>
                <Icon name="coffee-outline" size={20} color="#161d16" style={{ marginRight: 10 }} />
                <Text style={[styles.pillButtonText, { color: '#161d16' }]}>MULAI ISTIRAHAT</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#087F5B', marginTop: 16 }]} onPress={() => handleBukaKamera('KELUAR')}>
                <Icon name="logout-variant" size={20} color="#ffffff" style={{ marginRight: 10 }} />
                <Text style={styles.pillButtonText}>ABSEN KELUAR</Text>
              </TouchableOpacity>
            </>
          )}

          {sedangIstirahat && !sudahKeluar && (
            <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#007d48' }]} onPress={() => handleBukaKamera('SELESAI_ISTIRAHAT')}>
              <Icon name="coffee" size={20} color="#ffffff" style={{ marginRight: 10 }} />
              <Text style={styles.pillButtonText}>SELESAI ISTIRAHAT</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* TIMELINE */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineHeader}>TIMELINE HARI INI</Text>

          {absensiHariIni?.length === 0 && (
            <Text style={styles.timelineEmpty}>Belum ada catatan absensi hari ini.</Text>
          )}

          {absensiHariIni?.map((item: any, index: number) => {
            const cfg = JENIS_CONFIG[item.jenis] || { icon: 'check-circle', color: '#161d16', bg: '#e8f0e4', label: item.jenis };
            const isLast = index === (absensiHariIni.length - 1);
            return (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIcon, { backgroundColor: cfg.bg }]}>
                    <Icon name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  {!isLast && <View style={styles.timelineConnector} />}
                </View>
                <View style={[styles.timelineContent, isLast && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.timelineTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.timelineTime}>{format(new Date(item.waktu_server || item.waktu_lokal), 'HH:mm', { locale: id })}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Modal Kamera */}
        <Modal visible={isCameraOpen} animationType="slide" onRequestClose={() => setIsCameraOpen(false)}>
          <CameraView
            jenis={jenisAbsenTerpilih}
            onClose={() => setIsCameraOpen(false)}
            onPhotoTaken={handleSelesaiFoto}
          />
        </Modal>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7F4',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#161d16',
    letterSpacing: -1,
  },
  dateSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3d4a3d',
    marginTop: 8,
  },
  statusSection: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3d4a3d',
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  actionContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  pillButton: {
    borderRadius: 30,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timelineSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 64,
  },
  timelineHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#161d16',
    marginBottom: 24,
  },
  timelineEmpty: {
    fontSize: 14,
    color: '#3d4a3d',
    fontWeight: '500',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#dce5d9',
    marginVertical: 4,
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3d4a3d',
  },
  locationCardWrapper: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  locationCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
    shadowColor: '#161d16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  locationCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  locationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationStatusTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  locationStatusArea: {
    fontSize: 15,
    fontWeight: '800',
    color: '#161d16',
    marginTop: 2,
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#087F5B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  refreshLocBtnDisabled: {
    opacity: 0.65,
  },
  refreshLocBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  locationDesc: {
    fontSize: 12,
    color: '#3d4a3d',
    lineHeight: 18,
    marginBottom: 14,
  },
  locationMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3fcef',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2ece0',
  },
  locationMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  locationMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#dce5d9',
  },
  locationMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6d7b6c',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#161d16',
  },
});
