import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Modal, Image, ScrollView, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { insertAbsensiOffline } from '../../store/database';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import notifee, { TriggerType, RepeatFrequency, IntervalTrigger, TimeUnit } from '@notifee/react-native';

import { CameraView } from '../../components/CameraView';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const JENIS_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  MASUK:            { icon: 'login-variant',   color: '#006e2f', bg: '#e8f0e4', label: 'Masuk' },
  KELUAR:           { icon: 'logout-variant',  color: '#ba1a1a', bg: '#ffdad6', label: 'Keluar' },
  MULAI_ISTIRAHAT:  { icon: 'coffee-outline',  color: '#c77800', bg: '#ffefd4', label: 'Mulai Istirahat' },
  SELESAI_ISTIRAHAT:{ icon: 'coffee',          color: '#006e2f', bg: '#e8f0e4', label: 'Selesai Istirahat' },
};

export const AbsensiScreen = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [jenisAbsenTerpilih, setJenisAbsenTerpilih] = useState<'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT' | null>(null);

  const pageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const { data: absensiHariIni, isLoading, refetch } = useQuery({
    queryKey: ['absensi', 'hari-ini'],
    queryFn: async () => {
      const res = await api.get('/absensi/hari-ini');
      return res.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { jenis: string, lat: number, lng: number, foto_uri: string }) => {
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
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      } else {
        const res = await api.post(endpoint, {
          lat: payload.lat,
          lng: payload.lng,
        });
        return res.data;
      }
    },
    onSuccess: () => {
      Alert.alert('SUKSES', 'Absensi berhasil terkirim!');
      queryClient.invalidateQueries({ queryKey: ['absensi'] });
    },
    onError: (error, variables) => {
      console.log('Error absen API:', error);
      insertAbsensiOffline(
        variables.jenis, 
        variables.lat, 
        variables.lng, 
        variables.foto_uri, 
        new Date().toISOString()
      );
      Alert.alert('OFFLINE', 'Anda sedang offline. Absen disimpan lokal dan akan dikirim saat online.');
    }
  });

  const handleBukaKamera = (jenis: 'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT') => {
    setJenisAbsenTerpilih(jenis);
    setIsCameraOpen(true);
  };

  const handleSelesaiFoto = async (foto_uri: string, lat: number, lng: number) => {
    setIsCameraOpen(false);
    if (jenisAbsenTerpilih) {
      mutation.mutate({ jenis: jenisAbsenTerpilih, lat, lng, foto_uri });
      
      if (user?.role === 'SATPAM') {
        if (jenisAbsenTerpilih === 'MASUK') {
          try {
            await notifee.requestPermission();
            const trigger: IntervalTrigger = {
              type: TriggerType.INTERVAL,
              interval: 3,
              timeUnit: TimeUnit.HOURS,
            };
            await notifee.createTriggerNotification(
              {
                id: 'satpam_hourly_reminder',
                title: 'Waktunya Laporan Per 3 Jam!',
                body: 'Segera periksa area dan isi laporan rutin 3 jam Anda.',
                android: { channelId: 'default' },
              },
              trigger
            );
            console.log('Notifee: Reminder per 3 jam diaktifkan');
          } catch (e) {
            console.log('Notifee Error:', e);
          }
        } else if (jenisAbsenTerpilih === 'KELUAR') {
          await notifee.cancelNotification('satpam_hourly_reminder');
          console.log('Notifee: Reminder per 3 jam dibatalkan');
        }
      }
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
  const statusDot = sudahKeluar ? '#515f74' : sedangIstirahat ? '#c77800' : sudahMasuk ? '#007d48' : '#006e2f';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={{ opacity: pageAnim }}>

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
            <Text style={[styles.statusValue, { color: '#006e2f' }]}>BELUM ABSEN</Text>
          )}
        </View>

        {/* ACTIONS */}
        <View style={styles.actionContainer}>
          {!sudahMasuk && !sudahKeluar && (
            <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#006e2f' }]} onPress={() => handleBukaKamera('MASUK')}>
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
              <TouchableOpacity activeOpacity={0.8} style={[styles.pillButton, { backgroundColor: '#006e2f', marginTop: 16 }]} onPress={() => handleBukaKamera('KELUAR')}>
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
    backgroundColor: '#f3fcef',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3fcef',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3fcef',
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
});
