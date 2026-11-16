import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import SignatureScreen from 'react-native-signature-canvas';
import { useAuthStore } from '../../store/auth.store';
import { CameraView } from '../../components/CameraView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const INVENTORY_SATPAM = ['Kunci Gerbang', 'Radio HT', 'Senter', 'Rompi', 'Sepatu Dinas', 'Kendaraan Patroli'];
const INVENTORY_UTILITY = ['Sapu', 'Alat Pel', 'Mesin Vacuum', 'Tangga', 'Toolkit', 'APD'];

type TabType = 'BUAT' | 'RIWAYAT';

export const SerahTerimaScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('BUAT');
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

  // Fetch daftar staff penerima nyata dari server
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff-penerima'],
    queryFn: async () => {
      const res = await api.get('/serah-terima/staff-penerima');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  // Fetch riwayat serah terima
  const { data: riwayatList = [], isLoading: loadingRiwayat } = useQuery({
    queryKey: ['serah-terima', 'riwayat'],
    queryFn: async () => {
      const res = await api.get('/serah-terima/riwayat');
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        jenis: user?.role === 'SATPAM' ? 'PIKET' : 'PERALATAN',
        staff_baru_id: penerimaId,
        barang_list: items.map((item) => ({
          nama: item.name,
          kondisi: item.status,
          catatan: item.catatan,
        })),
        catatan: catatanShift,
        foto_urls: fotos,
        ttd_lama: signature,
      };

      const res = await api.post('/serah-terima/mulai', payload);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Sukses', 'Berita Acara Serah Terima berhasil dikirim.');
      queryClient.invalidateQueries({ queryKey: ['serah-terima', 'riwayat'] });
      setActiveTab('RIWAYAT');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengirim BAST.');
    },
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

  const selectedStaffObj = staffList.find((s: any) => s.id === penerimaId);

  const sigWebStyle = `
    .m-signature-pad {box-shadow: none; border: 1px solid #dce5d9; border-radius: 0px;} 
    .m-signature-pad--footer {display: none; margin: 0px;}
    body,html {width: 100%; height: 100%; background-color: #f5f5f5;}
  `;

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === 'BUAT' && styles.tabButtonActive]}
          onPress={() => setActiveTab('BUAT')}
        >
          <Icon name="file-document-edit-outline" size={18} color={activeTab === 'BUAT' ? '#006e2f' : '#6d7b6c'} />
          <Text style={[styles.tabText, activeTab === 'BUAT' && styles.tabTextActive]}>Buat BAST</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === 'RIWAYAT' && styles.tabButtonActive]}
          onPress={() => setActiveTab('RIWAYAT')}
        >
          <Icon name="history" size={18} color={activeTab === 'RIWAYAT' ? '#006e2f' : '#6d7b6c'} />
          <Text style={[styles.tabText, activeTab === 'RIWAYAT' && styles.tabTextActive]}>
            Riwayat & Masuk ({riwayatList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'BUAT' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.headerTitle}>{title}</Text>

          <Text style={styles.sectionLabel}>STAFF PENGGANTI (PENERIMA)</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setStaffModalVisible(true)} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.dropdownText, !selectedStaffObj && { color: '#6d7b6c', fontWeight: '500' }]}>
                {selectedStaffObj ? `${selectedStaffObj.nama} (${selectedStaffObj.nik})` : 'PILIH REKAN STAFF...'}
              </Text>
              <Icon name="chevron-down" size={20} color="#3d4a3d" />
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>CHECKLIST BARANG</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              
              <View style={styles.statusRow}>
                {['BAIK', 'RUSAK', 'HILANG'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.8}
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
                underlineColor="#dce5d9"
                activeUnderlineColor="#006e2f"
              />
            </View>
          ))}

          <Text style={styles.sectionLabel}>FOTO BUKTI POS / BARANG (MAX 3)</Text>
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
            underlineColor="#dce5d9"
            activeUnderlineColor="#006e2f"
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
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>DAFTAR SERAH TERIMA</Text>

          {loadingRiwayat ? (
            <ActivityIndicator color="#006e2f" style={{ marginTop: 40 }} />
          ) : riwayatList.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Icon name="clipboard-text-outline" size={48} color="#bccbb9" />
              <Text style={{ marginTop: 12, fontSize: 14, color: '#6d7b6c' }}>Belum ada riwayat serah terima.</Text>
            </View>
          ) : (
            riwayatList.map((item: any) => {
              const isPenerima = item.staff_baru_id === user?.id;
              const isMenunggu = item.status === 'MENUNGGU_KONFIRMASI';

              return (
                <View key={item.id} style={styles.riwayatCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={[styles.badge, isMenunggu ? { backgroundColor: '#fff3cd' } : { backgroundColor: '#cdeed5' }]}>
                      <Text style={[styles.badgeText, isMenunggu ? { color: '#856404' } : { color: '#006e2f' }]}>
                        {isMenunggu ? 'MENUNGGU KONFIRMASI' : 'SELESAI'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#6d7b6c' }}>
                      {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#161d16', marginTop: 10 }}>
                    {item.jenis === 'PIKET' ? 'Piket Pos Jaga' : 'Serah Terima Peralatan'}
                  </Text>

                  <Text style={{ fontSize: 13, color: '#3d4a3d', marginTop: 4 }}>
                    Pemberi: <Text style={{ fontWeight: '700' }}>{item.staff_lama?.nama || '-'}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, color: '#3d4a3d', marginTop: 2 }}>
                    Penerima: <Text style={{ fontWeight: '700' }}>{item.staff_baru?.nama || '-'}</Text>
                  </Text>

                  {item.catatan ? (
                    <Text style={{ fontSize: 12, color: '#6d7b6c', marginTop: 6, fontStyle: 'italic' }}>
                      "{item.catatan}"
                    </Text>
                  ) : null}

                  {isPenerima && isMenunggu && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.konfirmasiBtn}
                      onPress={() => navigation.navigate('KonfirmasiSerahTerimaModal', { serahTerimaId: item.id })}
                    >
                      <Icon name="signature-freehand" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.konfirmasiBtnText}>Tinjau & Konfirmasi Sekarang</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal Pilih Staff Nyata */}
      <Modal visible={isStaffModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PILIH REKAN PENERIMA</Text>
            {loadingStaff ? (
              <ActivityIndicator color="#006e2f" style={{ marginVertical: 20 }} />
            ) : staffList.length === 0 ? (
              <Text style={{ color: '#6d7b6c', textAlign: 'center', marginVertical: 20 }}>
                Tidak ada rekan staff aktif dengan role yang sama.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {staffList.map((s: any) => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={styles.modalOption}
                    onPress={() => { setPenerimaId(s.id); setStaffModalVisible(false); }}
                  >
                    <Text style={styles.modalOptionText}>{s.nama}</Text>
                    <Text style={{ fontSize: 12, color: '#6d7b6c', fontFamily: 'monospace' }}>NIK: {s.nik}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  container: { flex: 1, backgroundColor: '#f3fcef' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#006e2f',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6d7b6c',
  },
  tabTextActive: {
    color: '#006e2f',
  },
  scrollContent: { padding: 16, paddingBottom: 200, flexGrow: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#161d16', marginBottom: 20, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#3d4a3d', marginTop: 16, marginBottom: 8 },
  dropdownBtn: { backgroundColor: '#e8f0e4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#dce5d9' },
  dropdownText: { fontSize: 16, fontWeight: 'bold', color: '#161d16' },
  itemCard: { backgroundColor: '#e8f0e4', padding: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: '#dce5d9' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#161d16', marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3fcef', borderWidth: 1, borderColor: '#bccbb9' },
  statusBtnActive: { backgroundColor: '#006e2f', borderColor: '#006e2f' },
  statusBtnText: { fontSize: 12, fontWeight: 'bold', color: '#3d4a3d' },
  statusBtnTextActive: { color: '#ffffff' },
  inputCatatan: { backgroundColor: '#f3fcef', fontSize: 14, height: 40 },
  photoContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  photoThumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#dce5d9' },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#e8f0e4', borderWidth: 1, borderColor: '#bccbb9', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { fontWeight: 'bold', color: '#006e2f', fontSize: 10 },
  textArea: { backgroundColor: '#e8f0e4' },
  signatureContainer: { height: 150, borderWidth: 1, borderRadius: 12, overflow: 'hidden', borderColor: '#dce5d9', backgroundColor: '#e8f0e4' },
  sigActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sigClearBtn: { padding: 8 },
  sigClearText: { color: '#3d4a3d', fontWeight: 'bold', fontSize: 12 },
  sigSaveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#006e2f' },
  sigSaveText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  submitBtn: { marginTop: 32, backgroundColor: '#006e2f', borderRadius: 30, paddingVertical: 8 },
  submitBtnLabel: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  riwayatCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce5d9',
    marginBottom: 12,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  konfirmasiBtn: {
    marginTop: 12,
    backgroundColor: '#006e2f',
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  konfirmasiBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(22,29,22,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#f3fcef', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#161d16', marginBottom: 16 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#dce5d9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOptionText: { fontSize: 15, color: '#161d16', fontWeight: '600' },
  modalCloseBtn: { marginTop: 20, paddingVertical: 12, borderRadius: 30, backgroundColor: '#006e2f', alignItems: 'center' },
  modalCloseText: { color: '#ffffff', fontWeight: 'bold' }
});
