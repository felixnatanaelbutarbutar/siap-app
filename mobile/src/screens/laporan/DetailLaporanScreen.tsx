import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const DetailLaporanScreen = () => {
  const route = useRoute<any>();
  const { laporanId } = route.params;

  const { data: laporan, isLoading } = useQuery({
    queryKey: ['laporan', laporanId],
    queryFn: async () => {
      const res = await api.get(`/laporan/${laporanId}`);
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </View>
    );
  }

  if (!laporan) return null;

  let statusColor = '#111111';
  if (laporan.status === 'APPROVED') statusColor = '#007d48';
  if (laporan.status === 'REJECTED') statusColor = '#d30005';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.kategoriText}>{laporan.kategori}</Text>
          <Text style={styles.judulText}>{laporan.judul}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>
              {format(new Date(laporan.created_at), 'dd MMMM yyyy, HH:mm', { locale: id }).toUpperCase()}
            </Text>
            <Text style={[styles.statusBadge, { color: statusColor }]}>{laporan.status}</Text>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>DESKRIPSI</Text>
          <Text style={styles.deskripsiText}>{laporan.deskripsi}</Text>
        </View>

        {laporan.foto_urls && laporan.foto_urls.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>LAMPIRAN FOTO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotoContainer}>
              {laporan.foto_urls.map((url: string, index: number) => (
                <Image 
                  key={index}
                  source={{ uri: `http://localhost:9000/siap-storage/${url}` }} 
                  style={styles.fotoItem} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {laporan.komentar_admin && (
          <View style={styles.komentarSection}>
            <View style={styles.komentarHeader}>
              <Icon name="comment-text-outline" size={20} color="#111111" />
              <Text style={styles.komentarTitle}>KOMENTAR ADMIN</Text>
            </View>
            <Text style={styles.komentarText}>{laporan.komentar_admin}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  kategoriText: { fontSize: 12, fontWeight: '700', color: '#707072', letterSpacing: 1, marginBottom: 8 },
  judulText: { fontSize: 24, fontWeight: '900', color: '#111111', lineHeight: 30, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#707072' },
  statusBadge: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  contentSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111111', marginBottom: 16, letterSpacing: 1 },
  deskripsiText: { fontSize: 16, color: '#111111', lineHeight: 24 },
  fotoContainer: { flexDirection: 'row', paddingTop: 8 },
  fotoItem: { width: 160, height: 160, backgroundColor: '#f5f5f5', marginRight: 16, borderRadius: 0 },
  komentarSection: {
    margin: 24,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  komentarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  komentarTitle: { fontSize: 14, fontWeight: '800', color: '#111111', marginLeft: 8, letterSpacing: 1 },
  komentarText: { fontSize: 14, color: '#111111', lineHeight: 20 },
});
