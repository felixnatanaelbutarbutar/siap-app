import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import { format } from 'date-fns';

export const IzinCutiScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [jenis, setJenis] = useState<'IZIN' | 'CUTI' | 'SAKIT'>('IZIN');
  const [tanggalMulai, setTanggalMulai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tanggalSelesai, setTanggalSelesai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [keterangan, setKeterangan] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('jenis', jenis);
      formData.append('tanggal_mulai', tanggalMulai);
      formData.append('tanggal_selesai', tanggalSelesai);
      formData.append('keterangan', keterangan);

      if (fotoUri) {
        const filename = fotoUri.split('/').pop() || 'bukti.jpg';
        const finalUri = fotoUri.startsWith('file://') ? fotoUri : `file://${fotoUri}`;
        formData.append('foto', {
          uri: finalUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      const res = await api.post('/izin', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('SUKSES', 'Pengajuan berhasil dikirim.');
      queryClient.invalidateQueries({ queryKey: ['izin', 'saya'] });
      navigation.goBack();
    },
    onError: (error) => {
      console.log('Error izin:', error);
      Alert.alert('GAGAL', 'Terjadi kesalahan saat mengajukan izin.');
    }
  });

  const handlePilihFoto = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) return;
      setFotoUri(response.assets[0].uri || null);
    });
  };

  const Chip = ({ label, value }: { label: string, value: 'IZIN' | 'CUTI' | 'SAKIT' }) => {
    const isActive = jenis === value;
    return (
      <TouchableOpacity 
        style={[styles.chip, isActive && styles.chipActive]} 
        onPress={() => setJenis(value)}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>PENGAJUAN BARU</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionLabel}>JENIS PENGAJUAN</Text>
          <View style={styles.chipRow}>
            <Chip label="IZIN" value="IZIN" />
            <Chip label="CUTI" value="CUTI" />
            <Chip label="SAKIT" value="SAKIT" />
          </View>

          <Text style={styles.sectionLabel}>TANGGAL MULAI (YYYY-MM-DD)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              value={tanggalMulai}
              onChangeText={setTanggalMulai}
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#111111"
              theme={{ colors: { primary: '#111111', background: '#f5f5f5' } }}
            />
          </View>

          <Text style={styles.sectionLabel}>TANGGAL SELESAI (YYYY-MM-DD)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              value={tanggalSelesai}
              onChangeText={setTanggalSelesai}
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#111111"
              theme={{ colors: { primary: '#111111', background: '#f5f5f5' } }}
            />
          </View>

          <Text style={styles.sectionLabel}>KETERANGAN</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              value={keterangan}
              onChangeText={setKeterangan}
              multiline
              numberOfLines={4}
              style={[styles.input, { height: 120 }]}
              underlineColor="transparent"
              activeUnderlineColor="#111111"
              theme={{ colors: { primary: '#111111', background: '#f5f5f5' } }}
            />
          </View>

          <Text style={styles.sectionLabel}>BUKTI / SURAT DOKTER (OPSIONAL)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handlePilihFoto}>
            <Icon name="camera-plus" size={24} color="#111111" />
            <Text style={styles.uploadText}>{fotoUri ? 'GANTI FOTO' : 'UNGGAH FOTO'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, (!keterangan) && styles.submitButtonDisabled]} 
            onPress={() => mutation.mutate()}
            disabled={!keterangan || mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>AJUKAN SEKARANG</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#111111', letterSpacing: -1 },
  formContainer: { padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#111111', marginBottom: 12, letterSpacing: 1 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  chip: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cacacb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  chipText: { fontSize: 14, fontWeight: '700', color: '#111111' },
  chipTextActive: { color: '#ffffff' },
  inputWrapper: { marginBottom: 32, borderRadius: 8, overflow: 'hidden' },
  input: { backgroundColor: '#f5f5f5', fontSize: 16, height: 60 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    marginBottom: 48,
  },
  uploadText: { fontSize: 14, fontWeight: '700', color: '#111111', marginLeft: 8 },
  submitButton: {
    backgroundColor: '#111111',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#cacacb' },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
