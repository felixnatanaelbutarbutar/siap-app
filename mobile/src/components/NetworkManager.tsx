import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { getPendingAbsensi, markAbsensiSynced, markAbsensiFailed } from '../store/database';
import { api } from '../services/api';

const ENDPOINT_MAP: Record<string, string> = {
  MASUK: '/absensi/masuk',
  KELUAR: '/absensi/keluar',
  MULAI_ISTIRAHAT: '/absensi/mulai-istirahat',
  SELESAI_ISTIRAHAT: '/absensi/selesai-istirahat',
};

export const NetworkManager = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const pending = getPendingAbsensi();
    setPendingCount(pending.length);

    const unsubscribe = NetInfo.addEventListener((state) => {
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

    for (const item of pendingData) {
      try {
        const endpoint = ENDPOINT_MAP[item.jenis];
        if (!endpoint) {
          markAbsensiFailed(item.id);
          continue;
        }

        if (item.jenis === 'MASUK' || item.jenis === 'KELUAR') {
          const formData = new FormData();
          formData.append('lat', item.lat.toString());
          formData.append('lng', item.lng.toString());

          const filename = item.foto_uri?.split('/').pop() || 'photo_offline.jpg';
          const finalUri = item.foto_uri?.startsWith('file://')
            ? item.foto_uri
            : `file://${item.foto_uri}`;

          formData.append('foto', {
            uri: finalUri,
            name: filename,
            type: 'image/jpeg',
          } as any);

          await api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post(endpoint, {
            lat: Number(item.lat),
            lng: Number(item.lng),
          });
        }

        markAbsensiSynced(item.id);
      } catch (error: any) {
        console.log(`Gagal sinkronisasi data id ${item.id}:`, error);
        const status = error?.response?.status;
        // Jika ditolak permanen oleh validasi server (4xx selain 408/429), tandai gagal agar antrean berikutnya tidak tersumbat
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          markAbsensiFailed(item.id);
          continue;
        }
        // Masalah jaringan / server 5xx -> hentikan sementara dan coba lagi saat koneksi pulih
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
        {isSyncing
          ? `Menyelaraskan ${pendingCount} data tertunda...`
          : `Ada ${pendingCount} data belum tersinkron`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f1c40f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#161d16',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
