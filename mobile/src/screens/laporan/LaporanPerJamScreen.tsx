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

  // Mutasi Kirim Laporan Per 3 Jam
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
      Alert.alert('Sukses', 'Laporan per 3 jam berhasil dikirim.');
      queryClient.invalidateQueries({ queryKey: ['laporanPerJam'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim laporan per 3 jam.');
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
          title: 'Waktunya Laporan Per 3 Jam!',
          body: 'Segera periksa area dan isi laporan rutin 3 jam Anda.',
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
        <ActivityIndicator size="large" color="#161d16" />
      </View>
    );
  }

  const absenMasuk = absensiHariIni?.find((a: any) => a.jenis === 'MASUK');
  const sudahMasuk = !!absenMasuk;
  const sudahKeluar = absensiHariIni?.some((a: any) => a.jenis === 'KELUAR');
  const shiftAktif = sudahMasuk && !sudahKeluar;
  
  const currentHour = new Date().getHours();

  // Generate 3-hour interval timeline
  let hours: number[] = [];
  if (absenMasuk) {
    const jamMasuk = new Date(absenMasuk.waktu_server).getHours();
    for (let i = jamMasuk; i < 24; i += 3) {
      hours.push(i);
    }
  } else {
    // Default fallback if not checked in
    hours = [0, 3, 6, 9, 12, 15, 18, 21];
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>TIMELINE LAPORAN</Text>
      <ScrollView contentContainerStyle={styles.timelineContent}>
        {hours.map((hour) => {
          const lapor = laporanPerJam?.find((l: any) => l.jam === hour);
          const isCurrentHour = hour === currentHour;
          
          let circleColor = '#dce5d9'; // Default Abu-abu
          let statusText = 'Belum Ada Jadwal';
          let canTap = false;

          if (lapor) {
            circleColor = '#1eaa52'; // Hijau
            statusText = 'Selesai (' + lapor.status_keamanan + ')';
          } else if (shiftAktif && currentHour >= hour) {
            circleColor = '#f1c40f'; // Kuning
            statusText = (currentHour - hour < 3) ? 'Perlu Dilaporkan (Sekarang)' : 'Terlewat / Belum Dilaporkan';
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
                  activeOpacity={0.8}
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
              underlineColor="#dce5d9"
              activeUnderlineColor="#006e2f"
            />

            <View style={styles.actionRow}>
              <Button mode="outlined" onPress={() => { setModalVisible(false); resetForm(); }} style={[styles.btn, { borderColor: '#006e2f' }]} labelStyle={{ color: '#006e2f' }}>
                BATAL
              </Button>
              <Button 
                mode="contained" 
                onPress={() => mutation.mutate()} 
                loading={mutation.isPending} 
                disabled={!fotoUrl || mutation.isPending}
                style={[styles.btn, { backgroundColor: '#006e2f' }]}
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
    backgroundColor: '#f3fcef',
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
    color: '#161d16',
  },
  timelineContent: {
    paddingHorizontal: 24,
    paddingBottom: 200,
    flexGrow: 1,
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
    color: '#161d16',
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
    color: '#3d4a3d',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22,29,22,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f3fcef',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#161d16',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3d4a3d',
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
    borderRadius: 20,
    backgroundColor: '#e8f0e4',
    borderWidth: 1,
    borderColor: '#bccbb9',
  },
  statusItemActive: {
    backgroundColor: '#006e2f',
    borderColor: '#006e2f',
  },
  statusItemText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3d4a3d',
  },
  statusItemTextActive: {
    color: '#ffffff',
  },
  addFotoBtn: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#e8f0e4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bccbb9',
    borderStyle: 'dashed',
  },
  addFotoText: {
    fontWeight: 'bold',
    color: '#006e2f',
  },
  fotoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#dce5d9',
  },
  input: {
    backgroundColor: '#e8f0e4',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
  }
});
