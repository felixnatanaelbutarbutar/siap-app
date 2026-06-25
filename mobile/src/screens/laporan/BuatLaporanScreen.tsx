import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView } from '../../components/CameraView';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const KATEGORI_PER_ROLE: Record<string, string[]> = {
  SATPAM: ['PATROLI', 'PENJAGAAN', 'PENGAWALAN', 'INSIDEN', 'PEMELIHARAAN'],
  CS: ['KOMPLAIN', 'INFORMASI', 'PENGADUAN', 'LAIN_LAIN'],
  UTILITY: ['KEBERSIHAN', 'KERUSAKAN', 'PERBAIKAN', 'PEMERIKSAAN_RUTIN'],
};

export const BuatLaporanScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  const categories = user?.role ? KATEGORI_PER_ROLE[user.role] || [] : [];

  const [kategori, setKategori] = useState(categories[0] || '');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: { status: string }) => {
      const formData = new FormData();
      formData.append('kategori', kategori);
      formData.append('judul', judul);
      formData.append('deskripsi', deskripsi);
      formData.append('status', payload.status);

      fotos.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        formData.append('foto', {
          uri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      });

      const res = await api.post('/laporan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Sukses', 'Laporan berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['laporan'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Gagal menyimpan laporan.';
      Alert.alert('Error', msg);
    }
  });

  const handlePhotoTaken = (uri: string, lat: number, lng: number) => {
    setIsCameraOpen(false);
    if (fotos.length < 3) {
      setFotos([...fotos, uri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newFotos = [...fotos];
    newFotos.splice(index, 1);
    setFotos(newFotos);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>KATEGORI LAPORAN</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setCategoryModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.dropdownText}>{kategori}</Text>
          <Icon name="chevron-down" size={22} color="#3d4a3d" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>JUDUL</Text>
        <TextInput
          mode="flat"
          value={judul}
          onChangeText={setJudul}
          style={styles.input}
          underlineColor="#dce5d9"
          activeUnderlineColor="#006e2f"
        />

        <Text style={styles.sectionLabel}>DESKRIPSI</Text>
        <TextInput
          mode="flat"
          value={deskripsi}
          onChangeText={setDeskripsi}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          underlineColor="#dce5d9"
          activeUnderlineColor="#006e2f"
        />

        <Text style={styles.sectionLabel}>LAMPIRAN FOTO (MAX 3)</Text>
        <View style={styles.photoContainer}>
          {fotos.map((uri, idx) => (
            <View key={idx} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photoThumbnail} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(idx)} activeOpacity={0.8}>
                <Icon name="close" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
          {fotos.length < 3 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => setIsCameraOpen(true)} activeOpacity={0.8}>
              <Icon name="camera-plus" size={22} color="#006e2f" />
              <Text style={styles.addPhotoText}>FOTO</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionRow}>
          <Button 
            mode="outlined" 
            onPress={() => mutation.mutate({ status: 'DRAFT' })}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            style={[styles.btn, styles.draftBtn]}
            labelStyle={styles.draftBtnLabel}
          >
            SIMPAN DRAFT
          </Button>
          <Button 
            mode="contained" 
            onPress={() => mutation.mutate({ status: 'SUBMITTED' })}
            loading={mutation.isPending}
            disabled={mutation.isPending || !judul || !deskripsi || fotos.length === 0}
            style={[styles.btn, styles.submitBtn]}
            labelStyle={styles.submitBtnLabel}
          >
            SUBMIT
          </Button>
        </View>
      </ScrollView>

      {/* Modal Kategori */}
      <Modal visible={isCategoryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PILIH KATEGORI</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                style={styles.modalOption}
                onPress={() => {
                  setKategori(cat);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, kategori === cat && styles.modalOptionTextActive]}>
                  {cat}
                </Text>
                {kategori === cat && <Icon name="check" size={20} color="#006e2f" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCategoryModalVisible(false)} activeOpacity={0.85}>
              <Text style={styles.modalCloseText}>BATAL</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 200,
    flexGrow: 1,
  },
  sectionLabel: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#3d4a3d',
    marginTop: 20,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: '#e8f0e4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontWeight: 'bold',
    color: '#161d16',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#e8f0e4',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#dce5d9',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ba1a1a',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#e8f0e4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bccbb9',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontWeight: 'bold',
    color: '#006e2f',
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 30,
  },
  draftBtn: {
    borderColor: '#006e2f',
  },
  draftBtnLabel: {
    color: '#006e2f',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#006e2f',
  },
  submitBtnLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22,29,22,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#f3fcef',
    width: '100%',
    padding: 24,
    borderRadius: 24,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 16,
    color: '#161d16',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#3d4a3d',
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: '#006e2f',
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#006e2f',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontWeight: 'bold',
  }
});
