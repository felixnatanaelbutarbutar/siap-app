import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const ListLaporanScreen = () => {
  const navigation = useNavigation<any>();

  const { data: laporan, isLoading } = useQuery({
    queryKey: ['laporan', 'semua'],
    queryFn: async () => {
      const res = await api.get('/laporan');
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

  const renderItem = ({ item }: { item: any }) => {
    let statusColor = '#111111';
    if (item.status === 'APPROVED') statusColor = '#007d48';
    if (item.status === 'REJECTED') statusColor = '#d30005';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('DetailLaporan', { laporanId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.kategoriText}>{item.kategori}</Text>
          <Text style={[styles.statusBadge, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Text style={styles.judulText} numberOfLines={1}>{item.judul}</Text>
        <View style={styles.cardFooter}>
          <Icon name="calendar-outline" size={14} color="#707072" />
          <Text style={styles.dateText}>
            {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>LAPORAN</Text>
        </View>

        <FlatList
          data={laporan}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-document-outline" size={48} color="#cacacb" />
              <Text style={styles.emptyText}>Belum ada laporan.</Text>
            </View>
          }
        />

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('BuatLaporan')}
        >
          <Icon name="plus" size={32} color="#ffffff" />
        </TouchableOpacity>
      </View>
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
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#111111', letterSpacing: -1 },
  listContent: { padding: 24 },
  card: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  kategoriText: { fontSize: 12, fontWeight: '700', color: '#707072', letterSpacing: 1 },
  statusBadge: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  judulText: { fontSize: 18, fontWeight: '800', color: '#111111', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 14, color: '#707072', marginLeft: 6, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#707072', fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  }
});
