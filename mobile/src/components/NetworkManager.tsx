import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { getPendingAbsensi, markAbsensiSynced } from '../store/database';
import { api } from '../services/api';

export const NetworkManager = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check pending count initially
    const pending = getPendingAbsensi();
    setPendingCount(pending.length);

    // Listen to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        syncPendingData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const syncPendingData = async () => {
    const pendingData = getPendingAbsensi();
    if (pendingData.length === 0) return;

    setIsSyncing(true);
    setPendingCount(pendingData.length);

    // Proses sinkronisasi berurutan (FIFO)
    for (const item of pendingData) {
      try {
        const formData = new FormData();
        formData.append('jenis', item.jenis);
        formData.append('lat', item.lat.toString());
        formData.append('lng', item.lng.toString());
        
        // Asumsi waktu menggunakan waktu ketika device sedang offline
        // (Seharusnya ditambah field `waktu_offline` agar backend tahu waktu aslinya)
        formData.append('waktu_offline', item.waktu_lokal);

        const filename = item.foto_uri.split('/').pop() || 'photo_offline.jpg';
        formData.append('foto', {
          uri: item.foto_uri,
          name: filename,
          type: 'image/jpeg',
        } as any);

        await api.post('/absensi', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Sukses kirim -> ubah status di SQLite
        markAbsensiSynced(item.id);
        
      } catch (error) {
        console.log(`Gagal sinkronisasi data id ${item.id}:`, error);
        // Break loop agar urutan tetap terjaga
        break; 
      }
    }

    const sisa = getPendingAbsensi();
    setPendingCount(sisa.length);
    setIsSyncing(false);
  };

  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        {isSyncing ? `Menyelaraskan ${pendingCount} data tertunda...` : `Ada ${pendingCount} data belum tersinkron`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f1c40f', // Kuning peringatan
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#161d16',
    fontWeight: 'bold',
    fontSize: 12,
  }
});
