import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import SignatureScreen from 'react-native-signature-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getFileUrl } from '../../utils/url';
import Pdf from 'react-native-pdf';
import Share from 'react-native-share';

export const KonfirmasiSerahTerimaScreen = ({ route, navigation }: any) => {
  const { serahTerimaId } = route.params || { serahTerimaId: 'MOCK_ID' };
  const queryClient = useQueryClient();
  const sigRef = useRef<any>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['serahTerima', serahTerimaId],
    queryFn: async () => {
      try {
        const res = await api.get(`/serah-terima/${serahTerimaId}`);
        const found = res.data?.data;
        if (found) {
          return {
            id: found.id,
            pengirim_nama: found.staff_lama?.nama || '-',
            items: Array.isArray(found.barang_list)
              ? found.barang_list.map((b: any) => ({
                  name: b.nama,
                  status: b.kondisi,
                  catatan: b.catatan || '',
                }))
              : [],
            catatan: found.catatan || '',
            bast_pdf_url: found.bast_pdf_url || null,
          };
        }
      } catch (e) {
        // Fallback to searching in riwayat if direct single GET fails
        const res = await api.get('/serah-terima/riwayat');
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const found = list.find((item: any) => item.id === serahTerimaId) || list[0];
        if (found) {
          return {
            id: found.id,
            pengirim_nama: found.staff_lama?.nama || '-',
            items: Array.isArray(found.barang_list)
              ? found.barang_list.map((b: any) => ({
                  name: b.nama,
                  status: b.kondisi,
                  catatan: b.catatan || '',
                }))
              : [],
            catatan: found.catatan || '',
            bast_pdf_url: found.bast_pdf_url || null,
          };
        }
      }

      return {
        id: serahTerimaId,
        pengirim_nama: '-',
        items: [],
        catatan: '',
        bast_pdf_url: null,
      };
    },
  });

  useEffect(() => {
    if (data?.bast_pdf_url && !pdfUrl) {
      setPdfUrl(getFileUrl(data.bast_pdf_url));
    }
  }, [data?.bast_pdf_url, pdfUrl]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ttd_baru: signature };
      const res = await api.post(`/serah-terima/${serahTerimaId}/konfirmasi`, payload);
      return res.data?.data?.bast_pdf_url || '';
    },
    onSuccess: (url) => {
      setPdfUrl(url ? getFileUrl(url) : null);
      queryClient.invalidateQueries({ queryKey: ['serahTerima'] });
      Alert.alert('Sukses', 'Serah terima dikonfirmasi! BAST telah dibuat.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Gagal mengkonfirmasi serah terima.');
    }
  });

  const handleShare = async () => {
    if (!pdfUrl) return;
    try {
      await Share.open({
        url: pdfUrl,
        title: 'Berita Acara Serah Terima',
        message: 'Berikut adalah dokumen BAST SIAP.',
      });
    } catch (err: any) {
      console.log('Share error:', err);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#161d16" />
      </View>
    );
  }

  const sigWebStyle = `
    .m-signature-pad {box-shadow: none; border: 1px solid #dce5d9; border-radius: 0px;} 
    .m-signature-pad--footer {display: none; margin: 0px;}
    body,html {width: 100%; height: 100%; background-color: #f5f5f5;}
  `;

  return (
    <View style={styles.container}>
      {pdfUrl ? (
        // Mode Preview PDF
        <View style={styles.pdfContainer}>
          <Pdf
            source={{ uri: pdfUrl, cache: true }}
            onLoadComplete={(numberOfPages) => {
              console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page) => {
              console.log(`Current page: ${page}`);
            }}
            onError={(error) => {
              console.log(error);
            }}
            style={styles.pdf}
          />
          <View style={styles.actionRow}>
            <Button mode="contained" onPress={handleShare} style={styles.btnShare}>BAGIKAN PDF</Button>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.btnBack}>KEMBALI</Button>
          </View>
        </View>
      ) : (
        // Mode Konfirmasi
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>TINJAUAN SERAH TERIMA</Text>
          <Text style={styles.subtitle}>Dari: {data.pengirim_nama}</Text>

          <Text style={styles.sectionLabel}>DETAIL BARANG</Text>
          {data.items.map((item: any, index: number) => {
            const badgeBg = item.status === 'BAIK' ? '#cdeed5' : item.status === 'RUSAK' ? '#ffdad6' : '#ffefd4';
            const badgeFg = item.status === 'BAIK' ? '#087F5B' : item.status === 'RUSAK' ? '#ba1a1a' : '#c77800';
            return (
              <View key={index} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeFg }]}>{item.status}</Text>
                </View>
                {item.catatan ? (
                  <Text style={styles.itemCatatan}>Catatan: {item.catatan}</Text>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.sectionLabel}>CATATAN SHIFT</Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{data.catatan}</Text>
          </View>

          <Text style={styles.sectionLabel}>TANDA TANGAN KONFIRMASI</Text>
          <View style={styles.signatureContainer}>
            <SignatureScreen
              ref={sigRef}
              onOK={setSignature}
              webStyle={sigWebStyle}
              autoClear={false}
              descriptionText=""
            />
          </View>
          <View style={styles.sigActionRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => { sigRef.current?.clearSignature(); setSignature(null); }} style={styles.sigClearBtn}>
              <Text style={styles.sigClearText}>ULANGI</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => sigRef.current?.readSignature()} style={styles.sigSaveBtn}>
              <Text style={styles.sigSaveText}>SIMPAN TTD</Text>
            </TouchableOpacity>
          </View>

          <Button 
            mode="contained" 
            onPress={() => mutation.mutate()} 
            loading={mutation.isPending}
            disabled={!signature || mutation.isPending}
            style={styles.submitBtn}
            labelStyle={styles.submitBtnLabel}
          >
            KONFIRMASI TERIMA
          </Button>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#161d16', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#3d4a3d', textAlign: 'center', marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#3d4a3d', marginTop: 16, marginBottom: 8 },
  itemCard: { backgroundColor: '#e8f0e4', padding: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#dce5d9' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#161d16', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#cdeed5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#087F5B', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  itemCatatan: { marginTop: 8, fontSize: 12, color: '#3d4a3d' },
  noteBox: { backgroundColor: '#e8f0e4', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#087F5B' },
  noteText: { fontSize: 14, color: '#161d16' },
  signatureContainer: { height: 150, borderWidth: 1, borderRadius: 12, overflow: 'hidden', borderColor: '#dce5d9', backgroundColor: '#e8f0e4' },
  sigActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sigClearBtn: { padding: 8 },
  sigClearText: { color: '#3d4a3d', fontWeight: 'bold', fontSize: 12 },
  sigSaveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#087F5B' },
  sigSaveText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  submitBtn: { marginTop: 32, backgroundColor: '#087F5B', borderRadius: 30, paddingVertical: 8 },
  submitBtnLabel: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  pdfContainer: { flex: 1 },
  pdf: { flex: 1, backgroundColor: '#e8f0e4' },
  actionRow: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#F3F7F4' },
  btnShare: { flex: 1, backgroundColor: '#087F5B', borderRadius: 30 },
  btnBack: { flex: 1, borderColor: '#087F5B', borderRadius: 30 },
});

