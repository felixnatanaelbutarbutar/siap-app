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
        <ActivityIndicator size="large" color="#161d16" />
      </View>
    );
  }

  if (!laporan) return null;

  let statusColor = '#515f74';
  let statusBg = '#e8f0e4';
  if (laporan.status === 'APPROVED') { statusColor = '#006e2f'; statusBg = '#cdeed5'; }
  if (laporan.status === 'REJECTED') { statusColor = '#ba1a1a'; statusBg = '#ffdad6'; }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.kategoriText}>{laporan.kategori}</Text>
          <Text style={styles.judulText}>{laporan.judul}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>
              {format(new Date(laporan.created_at), 'dd MMMM yyyy, HH:mm', { locale: id }).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{laporan.status}</Text>
            </View>
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
              <Icon name="comment-text-outline" size={20} color="#161d16" />
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
  safeArea: { flex: 1, backgroundColor: '#f3fcef' },
  container: { flex: 1, backgroundColor: '#f3fcef' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  kategoriText: { fontSize: 12, fontWeight: '700', color: '#3d4a3d', letterSpacing: 1, marginBottom: 8 },
  judulText: { fontSize: 24, fontWeight: '900', color: '#161d16', lineHeight: 30, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#3d4a3d' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  contentSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#161d16', marginBottom: 16, letterSpacing: 1 },
  deskripsiText: { fontSize: 16, color: '#161d16', lineHeight: 24 },
  fotoContainer: { flexDirection: 'row', paddingTop: 8 },
  fotoItem: { width: 160, height: 160, backgroundColor: '#e8f0e4', marginRight: 16, borderRadius: 12 },
  komentarSection: {
    margin: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#e8f0e4',
    borderLeftWidth: 4,
    borderLeftColor: '#006e2f',
  },
  komentarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  komentarTitle: { fontSize: 14, fontWeight: '800', color: '#161d16', marginLeft: 8, letterSpacing: 1 },
  komentarText: { fontSize: 14, color: '#161d16', lineHeight: 20 },
});
