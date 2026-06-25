import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getAvatarUrl } from '../../utils/url';

type TabType = 'AJUKAN' | 'RIWAYAT';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING:  { bg: '#fff3cd', text: '#856404', icon: 'clock-outline' },
  APPROVED: { bg: '#d1f0dc', text: '#1a6b35', icon: 'check-circle-outline' },
  REJECTED: { bg: '#fce4e4', text: '#9b1c1c', icon: 'close-circle-outline' },
};

const JENIS_COLORS: Record<string, { bg: string; text: string }> = {
  IZIN:  { bg: '#fff3cd', text: '#856404' },
  CUTI:  { bg: '#dbeafe', text: '#1e40af' },
  SAKIT: { bg: '#fce4e4', text: '#9b1c1c' },
};

export const IzinCutiScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('AJUKAN');

  // Form state
  const [jenis, setJenis] = useState<'IZIN' | 'CUTI' | 'SAKIT'>('IZIN');
  const [tanggalMulai, setTanggalMulai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tanggalSelesai, setTanggalSelesai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [keterangan, setKeterangan] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  // Fetch riwayat
  const { data: riwayatList, isLoading: loadingRiwayat } = useQuery({
    queryKey: ['izin', 'saya'],
    queryFn: async () => {
      const res = await api.get('/izin/saya');
      return res.data.data;
    },
  });

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
      Alert.alert('✅ BERHASIL', 'Pengajuan Anda telah dikirimkan ke Admin.\nTunggu persetujuan dari Admin.');
      queryClient.invalidateQueries({ queryKey: ['izin', 'saya'] });
      // Reset form
      setKeterangan('');
      setFotoUri(null);
      setJenis('IZIN');
      setActiveTab('RIWAYAT');
    },
    onError: () => {
      Alert.alert('❌ GAGAL', 'Terjadi kesalahan saat mengajukan izin.\nCoba lagi nanti.');
    },
  });

  const handlePilihFoto = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) return;
      setFotoUri(response.assets[0].uri || null);
    });
  };

  const Chip = ({ label, value }: { label: string; value: 'IZIN' | 'CUTI' | 'SAKIT' }) => {
    const isActive = jenis === value;
    const colors = JENIS_COLORS[value];
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.chip,
          isActive && { backgroundColor: colors.bg, borderColor: colors.text },
        ]}
        onPress={() => setJenis(value)}
      >
        <Text style={[styles.chipText, isActive && { color: colors.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Icon name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerLabel}>PERMOHONAN</Text>
          <Text style={styles.headerTitle}>Izin & Cuti</Text>
        </View>
        <View style={styles.riwayatBadge}>
          <Text style={styles.riwayatBadgeText}>{riwayatList?.length ?? 0} pengajuan</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['AJUKAN', 'RIWAYAT'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.8}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={tab === 'AJUKAN' ? 'plus-circle-outline' : 'history'}
              size={18}
              color={activeTab === tab ? '#006e2f' : '#6d7b6c'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'AJUKAN' ? 'Ajukan Baru' : 'Riwayat Saya'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB: AJUKAN */}
      {activeTab === 'AJUKAN' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>JENIS PENGAJUAN</Text>
            <View style={styles.chipRow}>
              <Chip label="IZIN" value="IZIN" />
              <Chip label="CUTI" value="CUTI" />
              <Chip label="SAKIT" value="SAKIT" />
            </View>

            <TextInputField
              label="TANGGAL MULAI"
              value={tanggalMulai}
              onChange={setTanggalMulai}
              icon="calendar-start"
            />
            <TextInputField
              label="TANGGAL SELESAI"
              value={tanggalSelesai}
              onChange={setTanggalSelesai}
              icon="calendar-end"
            />
            <TextInputField
              label="KETERANGAN / ALASAN"
              value={keterangan}
              onChange={setKeterangan}
              icon="note-text-outline"
              multiline
              required
            />

            <Text style={styles.sectionLabel}>BUKTI / SURAT DOKTER (OPSIONAL)</Text>
            <TouchableOpacity
              style={[styles.uploadButton, !!fotoUri && styles.uploadButtonDone]}
              onPress={handlePilihFoto}
              activeOpacity={0.8}
            >
              <Icon name={fotoUri ? 'check-circle' : 'camera-plus'} size={24} color={fotoUri ? '#006e2f' : '#6d7b6c'} />
              <Text style={[styles.uploadText, !!fotoUri && { color: '#006e2f' }]}>
                {fotoUri ? 'FOTO TERPILIH — GANTI' : 'UNGGAH FOTO BUKTI'}
              </Text>
            </TouchableOpacity>
            {fotoUri && (
              <Image source={{ uri: getAvatarUrl(fotoUri) || fotoUri }} style={styles.previewImage} resizeMode="cover" />
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.submitButton, (!keterangan || mutation.isPending) && styles.submitButtonDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!keterangan || mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Icon name="send-check" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>AJUKAN SEKARANG</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* TAB: RIWAYAT */}
      {activeTab === 'RIWAYAT' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {loadingRiwayat ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#006e2f" />
              <Text style={styles.centerText}>Memuat riwayat...</Text>
            </View>
          ) : !riwayatList || riwayatList.length === 0 ? (
            <View style={styles.centerBox}>
              <Icon name="calendar-blank-outline" size={56} color="#bccbb9" />
              <Text style={styles.emptyTitle}>Belum Ada Pengajuan</Text>
              <Text style={styles.emptySubtitle}>Pengajuan izin/cuti Anda akan muncul di sini.</Text>
              <TouchableOpacity style={styles.ajukanBtn} onPress={() => setActiveTab('AJUKAN')}>
                <Text style={styles.ajukanBtnText}>Ajukan Sekarang</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 16, gap: 12 }}>
              {riwayatList.map((item: any) => {
                const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
                const jenisStyle = JENIS_COLORS[item.jenis] || JENIS_COLORS.IZIN;
                return (
                  <View key={item.id} style={styles.riwayatCard}>
                    {/* Top row: jenis + status */}
                    <View style={styles.riwayatTopRow}>
                      <View style={[styles.jenisBadge, { backgroundColor: jenisStyle.bg }]}>
                        <Text style={[styles.jenisBadgeText, { color: jenisStyle.text }]}>{item.jenis}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Icon name={statusStyle.icon} size={13} color={statusStyle.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Date */}
                    <View style={styles.riwayatDateRow}>
                      <Icon name="calendar-range" size={16} color="#6d7b6c" style={{ marginRight: 6 }} />
                      <Text style={styles.riwayatDate}>
                        {format(new Date(item.tanggal_mulai), 'd MMM yyyy', { locale: id })}
                        {item.tanggal_selesai !== item.tanggal_mulai &&
                          ` — ${format(new Date(item.tanggal_selesai), 'd MMM yyyy', { locale: id })}`}
                      </Text>
                    </View>

                    {/* Keterangan */}
                    {item.keterangan && (
                      <Text style={styles.riwayatKet} numberOfLines={2}>
                        {item.keterangan}
                      </Text>
                    )}

                    {/* Komentar admin jika ada */}
                    {item.komentar_admin && (
                      <View style={styles.komentarBox}>
                        <Text style={styles.komentarLabel}>Catatan Admin:</Text>
                        <Text style={styles.komentarText}>{item.komentar_admin}</Text>
                      </View>
                    )}

                    {/* Tanggal pengajuan */}
                    <Text style={styles.riwayatCreated}>
                      Diajukan: {format(new Date(item.created_at), 'd MMM yyyy HH:mm', { locale: id })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// Simple text input helper component
const { TextInput } = require('react-native');
const TextInputField = ({
  label,
  value,
  onChange,
  icon,
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: string;
  multiline?: boolean;
  required?: boolean;
}) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={styles.sectionLabel}>
      {label}
      {required && <Text style={{ color: '#ba1a1a' }}> *</Text>}
    </Text>
    <View style={styles.textInputWrapper}>
      <Icon name={icon} size={20} color="#6d7b6c" style={{ marginRight: 10 }} />
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={[styles.textInput, multiline && { height: 100, textAlignVertical: 'top' }]}
        placeholderTextColor="#9baa97"
        placeholder={label}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#006e2f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  riwayatBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  riwayatBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0e4',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3fcef',
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  tabItemActive: {
    backgroundColor: '#e8f0e4',
    borderColor: '#006e2f',
  },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#6d7b6c' },
  tabLabelActive: { color: '#006e2f' },
  container: { flex: 1, backgroundColor: '#f3fcef' },
  formCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e8f0e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#515f74',
    marginBottom: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3fcef',
    borderWidth: 1.5,
    borderColor: '#bccbb9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '800', color: '#515f74' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3fcef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  inputText: { fontSize: 15, color: '#161d16', fontWeight: '600' },
  dateHint: { marginBottom: 20 },
  dateHintText: { fontSize: 11, color: '#9baa97' },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3fcef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  textInput: { flex: 1, fontSize: 15, color: '#161d16', padding: 0 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3fcef',
    borderWidth: 1.5,
    borderColor: '#bccbb9',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonDone: {
    borderColor: '#006e2f',
    borderStyle: 'solid',
    backgroundColor: '#e8f0e4',
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: '#6d7b6c', marginLeft: 8 },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#006e2f',
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#006e2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: '#bccbb9', shadowOpacity: 0 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Riwayat
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  centerText: { color: '#6d7b6c', marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#161d16', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#6d7b6c', textAlign: 'center' },
  ajukanBtn: {
    marginTop: 16,
    backgroundColor: '#006e2f',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  ajukanBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  riwayatCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8f0e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  riwayatTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  jenisBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jenisBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  riwayatDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  riwayatDate: { fontSize: 13, fontWeight: '700', color: '#161d16' },
  riwayatKet: { fontSize: 13, color: '#515f74', marginBottom: 8, lineHeight: 18 },
  komentarBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  komentarLabel: { fontSize: 10, fontWeight: '800', color: '#856404', marginBottom: 2, letterSpacing: 0.5 },
  komentarText: { fontSize: 13, color: '#856404' },
  riwayatCreated: { fontSize: 11, color: '#9baa97' },
});
