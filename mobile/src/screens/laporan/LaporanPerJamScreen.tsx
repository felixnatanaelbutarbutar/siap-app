import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format } from 'date-fns';
import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';
import { CameraView } from '../../components/CameraView';

const STATUS_KEAMANAN = ['AMAN', 'ADA_TEMUAN', 'PERLU_PERIKSA'];

export const LaporanPerJamScreen = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [statusKeamanan, setStatusKeamanan] = useState(STATUS_KEAMANAN[0]);
  const [catatan, setCatatan] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const { data: absensiHariIni, isLoading: loadingAbsen } = useQuery({
    queryKey: ['absensi', 'hari-ini'],
    queryFn: async () => {
      const res = await api.get('/absensi/hari-ini', { params: { tanggal: todayStr } });
      return res.data.data;
    },
  });

  const { data: laporanPerJam, isLoading: loadingLaporan } = useQuery({
    queryKey: ['laporanPerJam', todayStr],
    queryFn: async () => {
      const res = await api.get('/laporan/perjam', { params: { tanggal: todayStr } });
      return res.data.data;
    },
  });

  // Mutasi Kirim Laporan Per Jam
  const mutation = useMutation({
    mutationFn: async () => {
      if (selectedHour === null || !fotoUrl) throw new Error('Data tidak lengkap');
      const formData = new FormData();
      formData.append('jam', selectedHour.toString());
      formData.append('status_keamanan', statusKeamanan);
      formData.append('catatan', catatan);
      
      const filename = fotoUrl.split('/').pop() || 'photo_perjam.jpg';
      formData.append('foto', {
        uri: fotoUrl,
        name: filename,
        type: 'image/jpeg',
      } as any);

      // (Kita asumsikan lat lng tidak dikirim ke endpoint per jam atau di-handle backend/kamera watermarked)
      formData.append('lat', '0');
      formData.append('lng', '0');

      const res = await api.post('/laporan/perjam', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Sukses', 'Laporan per jam berhasil dikirim.');
      queryClient.invalidateQueries({ queryKey: ['laporanPerJam'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim laporan per jam.');
    }
  });

  const resetForm = () => {
    setStatusKeamanan(STATUS_KEAMANAN[0]);
    setCatatan('');
    setFotoUrl(null);
    setSelectedHour(null);
  };

  // Setup Notifee Reminder (setiap jam 00)
  useEffect(() => {
    async function setupReminder() {
      await notifee.requestPermission();

      const trigger = {
        type: TriggerType.TIMESTAMP,
        // Dibuat sederhana: trigger setiap 1 jam jika belum dimatikan
        timestamp: new Date(Date.now() + 3600000).getTime(),
        repeatFrequency: RepeatFrequency.HOURLY,
      };

      await notifee.createTriggerNotification(
        {
          title: 'Waktunya Laporan Per Jam!',
          body: 'Segera periksa area dan isi laporan per jam Anda.',
          android: {
            channelId: 'default',
          },
        },
        trigger as any
      );
    }
    setupReminder();
  }, []);

  const handleBukaForm = (jam: number) => {
    setSelectedHour(jam);
    setModalVisible(true);
  };

  const handlePhotoTaken = (uri: string, lat: number, lng: number) => {
    setFotoUrl(uri);
    setIsCameraOpen(false);
  };

  if (loadingAbsen || loadingLaporan) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  const sudahMasuk = absensiHariIni?.some((a: any) => a.jenis === 'MASUK');
  const sudahKeluar = absensiHariIni?.some((a: any) => a.jenis === 'KELUAR');
  const shiftAktif = sudahMasuk && !sudahKeluar;
  
  const currentHour = new Date().getHours();

  // Generate 24 hours timeline
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>TIMELINE LAPORAN</Text>
      <ScrollView contentContainerStyle={styles.timelineContent}>
        {hours.map((hour) => {
          const lapor = laporanPerJam?.find((l: any) => l.jam === hour);
          const isCurrentHour = hour === currentHour;
          
          let circleColor = '#e5e5e5'; // Default Abu-abu
          let statusText = 'Belum Ada Jadwal';
          let canTap = false;

          if (lapor) {
            circleColor = '#1eaa52'; // Hijau
            statusText = 'Selesai (' + lapor.status_keamanan + ')';
          } else if (shiftAktif && hour <= currentHour) {
            circleColor = '#f1c40f'; // Kuning
            statusText = isCurrentHour ? 'Perlu Dilaporkan (Sekarang)' : 'Terlewat / Belum Dilaporkan';
            canTap = true;
          }

          return (
            <TouchableOpacity 
              key={hour} 
              style={styles.timelineRow} 
              disabled={!canTap}
              onPress={() => handleBukaForm(hour)}
            >
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{hour.toString().padStart(2, '0')}:00</Text>
              </View>
              <View style={[styles.circle, { backgroundColor: circleColor }]} />
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal Form */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>LAPORAN PUKUL {selectedHour?.toString().padStart(2, '0')}:00</Text>
            
            <Text style={styles.label}>STATUS KEAMANAN</Text>
            <View style={styles.statusGrid}>
              {STATUS_KEAMANAN.map(s => (
                <TouchableOpacity 
                  key={s}
                  style={[styles.statusItem, statusKeamanan === s && styles.statusItemActive]}
                  onPress={() => setStatusKeamanan(s)}
                >
                  <Text style={[styles.statusItemText, statusKeamanan === s && styles.statusItemTextActive]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>FOTO BUKTI (WAJIB)</Text>
            {fotoUrl ? (
              <TouchableOpacity onPress={() => setIsCameraOpen(true)}>
                <Image source={{ uri: fotoUrl }} style={styles.fotoPreview} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addFotoBtn} onPress={() => setIsCameraOpen(true)}>
                <Text style={styles.addFotoText}>+ AMBIL FOTO</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>CATATAN</Text>
            <TextInput
              mode="flat"
              value={catatan}
              onChangeText={setCatatan}
              style={styles.input}
              underlineColor="#111111"
              activeUnderlineColor="#111111"
            />

            <View style={styles.actionRow}>
              <Button mode="outlined" onPress={() => { setModalVisible(false); resetForm(); }} style={[styles.btn, { borderColor: '#111111' }]} labelStyle={{ color: '#111111' }}>
                BATAL
              </Button>
              <Button 
                mode="contained" 
                onPress={() => mutation.mutate()} 
                loading={mutation.isPending} 
                disabled={!fotoUrl || mutation.isPending}
                style={[styles.btn, { backgroundColor: '#111111' }]}
              >
                KIRIM
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Kamera */}
      <Modal visible={isCameraOpen} animationType="slide" onRequestClose={() => setIsCameraOpen(false)}>
        <CameraView 
          jenis={null} 
          onClose={() => setIsCameraOpen(false)} 
          onPhotoTaken={handlePhotoTaken} 
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#111111',
  },
  timelineContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeBox: {
    width: 60,
  },
  timeText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111111',
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  statusBox: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#707072',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111111',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#707072',
    marginTop: 16,
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  statusItemActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  statusItemText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#707072',
  },
  statusItemTextActive: {
    color: '#ffffff',
  },
  addFotoBtn: {
    height: 100,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'dashed',
  },
  addFotoText: {
    fontWeight: 'bold',
    color: '#111111',
  },
  fotoPreview: {
    width: '100%',
    height: 150,
    backgroundColor: '#e5e5e5',
  },
  input: {
    backgroundColor: '#f5f5f5',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 0,
  }
});
