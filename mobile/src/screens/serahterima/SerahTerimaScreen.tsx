import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import SignatureScreen from 'react-native-signature-canvas';
import { useAuthStore } from '../../store/auth.store';
import { CameraView } from '../../components/CameraView';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';

const INVENTORY_SATPAM = ['Kunci Gerbang', 'Radio HT', 'Senter', 'Rompi', 'Sepatu Dinas', 'Kendaraan Patroli'];
const INVENTORY_UTILITY = ['Sapu', 'Alat Pel', 'Mesin Vacuum', 'Tangga', 'Toolkit', 'APD'];

// Mock Data untuk Staff Pengganti
const MOCK_STAFF = [
  { id: 'STAFF_1', nama: 'Budi Santoso' },
  { id: 'STAFF_2', nama: 'Agus Pratama' },
  { id: 'STAFF_3', nama: 'Joko Widodo' },
];

export const SerahTerimaScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  
  const title = user?.role === 'SATPAM' ? 'SERAH TERIMA PIKET' : 'SERAH TERIMA PERALATAN';
  const defaultItems = user?.role === 'SATPAM' ? INVENTORY_SATPAM : INVENTORY_UTILITY;

  const [penerimaId, setPenerimaId] = useState<string | null>(null);
  const [items, setItems] = useState(
    defaultItems.map(name => ({ name, status: 'BAIK', catatan: '' }))
  );
  const [catatanShift, setCatatanShift] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  const [isStaffModalVisible, setStaffModalVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const sigRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        penerima_id: penerimaId,
        catatan: catatanShift,
        items,
        signature, // Base64
        fotos, // URL lokal (seharusnya di-upload multipart dulu jika real)
      };
      
      const res = await api.post('/serah-terima', payload);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Sukses', 'Berita Acara Serah Terima berhasil dikirim.');
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengirim BAST.');
    }
  });

  const handleSignature = (sig: string) => {
    setSignature(sig);
  };

  const handleClearSignature = () => {
    sigRef.current?.clearSignature();
    setSignature(null);
  };

  const updateItemStatus = (index: number, status: string) => {
    const newItems = [...items];
    newItems[index].status = status;
    setItems(newItems);
  };

  const updateItemCatatan = (index: number, catatan: string) => {
    const newItems = [...items];
    newItems[index].catatan = catatan;
    setItems(newItems);
  };

  const handlePhotoTaken = (uri: string) => {
    setIsCameraOpen(false);
    if (fotos.length < 3) setFotos([...fotos, uri]);
  };

  const sigWebStyle = `
    .m-signature-pad {box-shadow: none; border: 1px solid #e5e5e5; border-radius: 0px;} 
    .m-signature-pad--footer {display: none; margin: 0px;}
    body,html {width: 100%; height: 100%; background-color: #f5f5f5;}
  `;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>{title}</Text>

        <Text style={styles.sectionLabel}>STAFF PENGGANTI (PENERIMA)</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setStaffModalVisible(true)}>
          <Text style={styles.dropdownText}>
            {penerimaId ? MOCK_STAFF.find(s => s.id === penerimaId)?.nama : 'PILIH STAFF...'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>CHECKLIST BARANG</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            
            <View style={styles.statusRow}>
              {['BAIK', 'RUSAK', 'HILANG'].map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.statusBtn, item.status === s && styles.statusBtnActive]}
                  onPress={() => updateItemStatus(index, s)}
                >
                  <Text style={[styles.statusBtnText, item.status === s && styles.statusBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              mode="flat"
              placeholder="Catatan Kondisi (Opsional)"
              value={item.catatan}
              onChangeText={(txt) => updateItemCatatan(index, txt)}
              style={styles.inputCatatan}
              underlineColor="#e5e5e5"
              activeUnderlineColor="#111111"
            />
          </View>
        ))}

        <Text style={styles.sectionLabel}>FOTO BUKTI (MAX 3)</Text>
        <View style={styles.photoContainer}>
          {fotos.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.photoThumbnail} />
          ))}
          {fotos.length < 3 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => setIsCameraOpen(true)}>
              <Text style={styles.addPhotoText}>+ FOTO</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>CATATAN UNTUK SHIFT BERIKUTNYA</Text>
        <TextInput
          mode="flat"
          value={catatanShift}
          onChangeText={setCatatanShift}
          style={styles.textArea}
          multiline
          numberOfLines={3}
          underlineColor="#e5e5e5"
          activeUnderlineColor="#111111"
        />

        <Text style={styles.sectionLabel}>TANDA TANGAN ANDA</Text>
        <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={sigRef}
            onOK={handleSignature}
            webStyle={sigWebStyle}
            autoClear={false}
            descriptionText=""
          />
        </View>
        <View style={styles.sigActionRow}>
          <TouchableOpacity onPress={handleClearSignature} style={styles.sigClearBtn}>
            <Text style={styles.sigClearText}>ULANGI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => sigRef.current?.readSignature()} style={styles.sigSaveBtn}>
            <Text style={styles.sigSaveText}>SIMPAN TTD</Text>
          </TouchableOpacity>
        </View>

        <Button 
          mode="contained" 
          onPress={() => mutation.mutate()} 
          loading={mutation.isPending}
          disabled={!penerimaId || !signature || mutation.isPending}
          style={styles.submitBtn}
          labelStyle={styles.submitBtnLabel}
        >
          KIRIM SERAH TERIMA
        </Button>
      </ScrollView>

      {/* Modal Staff */}
      <Modal visible={isStaffModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PILIH STAFF PENERIMA</Text>
            {MOCK_STAFF.map(s => (
              <TouchableOpacity 
                key={s.id} 
                style={styles.modalOption}
                onPress={() => { setPenerimaId(s.id); setStaffModalVisible(false); }}
              >
                <Text style={styles.modalOptionText}>{s.nama}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setStaffModalVisible(false)}>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111', marginBottom: 24, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#707072', marginTop: 16, marginBottom: 8 },
  dropdownBtn: { backgroundColor: '#f5f5f5', padding: 16, borderWidth: 1, borderColor: '#e5e5e5' },
  dropdownText: { fontSize: 16, fontWeight: 'bold', color: '#111111' },
  itemCard: { backgroundColor: '#f5f5f5', padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e5e5' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cacacb' },
  statusBtnActive: { backgroundColor: '#111111', borderColor: '#111111' },
  statusBtnText: { fontSize: 12, fontWeight: 'bold', color: '#707072' },
  statusBtnTextActive: { color: '#ffffff' },
  inputCatatan: { backgroundColor: '#ffffff', fontSize: 14, height: 40 },
  photoContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  photoThumbnail: { width: 80, height: 80, backgroundColor: '#e5e5e5' },
  addPhotoBtn: { width: 80, height: 80, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#111111', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { fontWeight: 'bold', color: '#111111', fontSize: 10 },
  textArea: { backgroundColor: '#f5f5f5' },
  signatureContainer: { height: 150, borderWidth: 1, borderColor: '#111111', backgroundColor: '#f5f5f5' },
  sigActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sigClearBtn: { padding: 8 },
  sigClearText: { color: '#707072', fontWeight: 'bold', fontSize: 12 },
  sigSaveBtn: { padding: 8, backgroundColor: '#111111' },
  sigSaveText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  submitBtn: { marginTop: 32, backgroundColor: '#111111', borderRadius: 0, paddingVertical: 8 },
  submitBtnLabel: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#ffffff', padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 16 },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  modalOptionText: { fontSize: 16, color: '#111111', fontWeight: '500' },
  modalCloseBtn: { marginTop: 24, paddingVertical: 12, backgroundColor: '#111111', alignItems: 'center' },
  modalCloseText: { color: '#ffffff', fontWeight: 'bold' }
});
