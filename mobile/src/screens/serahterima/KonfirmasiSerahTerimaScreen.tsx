import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import SignatureScreen from 'react-native-signature-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
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
      // Endpoint mock / simulasi
      // const res = await api.get(`/serah-terima/${serahTerimaId}`);
      // return res.data.data;
      
      return {
        id: serahTerimaId,
        pengirim_nama: 'Joko Widodo',
        items: [
          { name: 'Kunci Gerbang', status: 'BAIK', catatan: '' },
          { name: 'Radio HT', status: 'RUSAK', catatan: 'Baterai bocor' }
        ],
        catatan: 'Hati-hati dengan Radio HT nomor 2.'
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { signature };
      // Panggil endpoint konfirmasi yang menghasilkan URL PDF BAST
      // const res = await api.post(`/serah-terima/${serahTerimaId}/konfirmasi`, payload);
      // return res.data.pdfUrl;
      
      // Simulasi sukses dan dapat PDF url (menggunakan sample PDF)
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve('http://samples.leanpub.com/thereactnativebook-sample.pdf'), 1500);
      });
    },
    onSuccess: (url) => {
      setPdfUrl(url);
      queryClient.invalidateQueries({ queryKey: ['serahTerima'] });
      Alert.alert('Sukses', 'Serah terima dikonfirmasi! BAST telah dibuat.');
    },
    onError: () => {
      Alert.alert('Error', 'Gagal mengkonfirmasi serah terima.');
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
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  const sigWebStyle = `
    .m-signature-pad {box-shadow: none; border: 1px solid #e5e5e5; border-radius: 0px;} 
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
            onLoadComplete={(numberOfPages, filePath) => {
              console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page, numberOfPages) => {
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
          {data.items.map((item: any, index: number) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
              {item.catatan ? (
                <Text style={styles.itemCatatan}>Catatan: {item.catatan}</Text>
              ) : null}
            </View>
          ))}

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
            <TouchableOpacity onPress={() => { sigRef.current?.clearSignature(); setSignature(null); }} style={styles.sigClearBtn}>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#707072', textAlign: 'center', marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#707072', marginTop: 16, marginBottom: 8 },
  itemCard: { backgroundColor: '#f5f5f5', padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e5e5' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#111111', paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  itemCatatan: { marginTop: 8, fontSize: 12, color: '#707072' },
  noteBox: { backgroundColor: '#f5f5f5', padding: 16, borderLeftWidth: 4, borderLeftColor: '#111111' },
  noteText: { fontSize: 14, color: '#111111' },
  signatureContainer: { height: 150, borderWidth: 1, borderColor: '#111111', backgroundColor: '#f5f5f5' },
  sigActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sigClearBtn: { padding: 8 },
  sigClearText: { color: '#707072', fontWeight: 'bold', fontSize: 12 },
  sigSaveBtn: { padding: 8, backgroundColor: '#111111' },
  sigSaveText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  submitBtn: { marginTop: 32, backgroundColor: '#111111', borderRadius: 0, paddingVertical: 8 },
  submitBtnLabel: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  
  pdfContainer: { flex: 1 },
  pdf: { flex: 1, backgroundColor: '#f5f5f5' },
  actionRow: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#ffffff' },
  btnShare: { flex: 1, backgroundColor: '#111111', borderRadius: 0 },
  btnBack: { flex: 1, borderColor: '#111111', borderRadius: 0 },
});
