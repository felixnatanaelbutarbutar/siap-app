import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Modal, Image, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { insertAbsensiOffline } from '../../store/database';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';

import { CameraView } from '../../components/CameraView';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const AbsensiScreen = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [jenisAbsenTerpilih, setJenisAbsenTerpilih] = useState<'MASUK' | 'KELUAR' | 'MULAI_ISTIRAHAT' | 'SELESAI_ISTIRAHAT' | null>(null);

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
            const trigger: any = {
              type: TriggerType.TIMESTAMP,
              timestamp: new Date(Date.now() + 3600000).getTime(), 
              repeatFrequency: RepeatFrequency.HOURLY,
            };
            await notifee.createTriggerNotification(
              {
                id: 'satpam_hourly_reminder',
                title: 'Waktunya Laporan Per Jam!',
                body: 'Segera periksa area dan isi laporan per jam Anda.',
                android: { channelId: 'default' },
              },
              trigger
            );
            console.log('Notifee: Reminder per jam diaktifkan');
          } catch (e) {
            console.log('Notifee Error:', e);
          }
        } else if (jenisAbsenTerpilih === 'KELUAR') {
          await notifee.cancelNotification('satpam_hourly_reminder');
          console.log('Notifee: Reminder per jam dibatalkan');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  const sudahMasuk = absensiHariIni?.some((a: any) => a.jenis === 'MASUK');
  const sudahKeluar = absensiHariIni?.some((a: any) => a.jenis === 'KELUAR');
  const sedangIstirahat = absensiHariIni?.some((a: any) => a.jenis === 'MULAI_ISTIRAHAT') && !absensiHariIni?.some((a: any) => a.jenis === 'SELESAI_ISTIRAHAT');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} bounces={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>ABSENSI HARI INI</Text>
          <Text style={styles.dateSubtitle}>{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id }).toUpperCase()}</Text>
        </View>

        {/* STATUS BAR */}
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>STATUS SHIFT</Text>
          {sudahKeluar ? (
            <Text style={[styles.statusValue, { color: '#111111' }]}>SELESAI SHIFT</Text>
          ) : sedangIstirahat ? (
            <Text style={[styles.statusValue, { color: '#F59E0B' }]}>SEDANG ISTIRAHAT</Text>
          ) : sudahMasuk ? (
            <Text style={[styles.statusValue, { color: '#007d48' }]}>SHIFT AKTIF</Text>
          ) : (
            <Text style={[styles.statusValue, { color: '#d30005' }]}>BELUM ABSEN</Text>
          )}
        </View>

        {/* ACTIONS */}
        <View style={styles.actionContainer}>
          {!sudahMasuk && !sudahKeluar && (
            <TouchableOpacity style={[styles.pillButton, { backgroundColor: '#111111' }]} onPress={() => handleBukaKamera('MASUK')}>
              <Text style={styles.pillButtonText}>ABSEN MASUK</Text>
            </TouchableOpacity>
          )}
          
          {sudahMasuk && !sudahKeluar && !sedangIstirahat && (
            <>
              <TouchableOpacity style={[styles.pillButton, { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e5e5' }]} onPress={() => handleBukaKamera('MULAI_ISTIRAHAT')}>
                <Text style={[styles.pillButtonText, { color: '#111111' }]}>MULAI ISTIRAHAT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pillButton, { backgroundColor: '#d30005', marginTop: 16 }]} onPress={() => handleBukaKamera('KELUAR')}>
                <Text style={styles.pillButtonText}>ABSEN KELUAR</Text>
              </TouchableOpacity>
            </>
          )}

          {sedangIstirahat && !sudahKeluar && (
            <TouchableOpacity style={[styles.pillButton, { backgroundColor: '#007d48' }]} onPress={() => handleBukaKamera('SELESAI_ISTIRAHAT')}>
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

          {absensiHariIni?.map((item: any) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineIcon}>
                <Icon name="check-circle" size={24} color="#111111" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.jenis.replace('_', ' ')}</Text>
                <Text style={styles.timelineTime}>{format(new Date(item.waktu_server || item.waktu_lokal), 'HH:mm', { locale: id })}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Modal Kamera */}
        <Modal visible={isCameraOpen} animationType="slide" onRequestClose={() => setIsCameraOpen(false)}>
          <CameraView 
            jenis={jenisAbsenTerpilih} 
            onClose={() => setIsCameraOpen(false)} 
            onPhotoTaken={handleSelesaiFoto} 
          />
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -1,
  },
  dateSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#707072',
    marginTop: 8,
  },
  statusSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#f5f5f5',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#707072',
    marginBottom: 8,
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
    borderBottomColor: '#e5e5e5',
  },
  pillButton: {
    borderRadius: 30, // Nike pill button
    height: 60,
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
    color: '#111111',
    marginBottom: 24,
  },
  timelineEmpty: {
    fontSize: 14,
    color: '#707072',
    fontWeight: '500',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#707072',
  },
});
