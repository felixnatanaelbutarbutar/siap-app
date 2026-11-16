import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { getPendingAbsensi, markAbsensiSynced, markAbsensiFailed } from '../store/database';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';

const ENDPOINT_MAP: Record<string, string> = {
  MASUK: '/absensi/masuk',
  KELUAR: '/absensi/keluar',
  MULAI_ISTIRAHAT: '/absensi/mulai-istirahat',
  SELESAI_ISTIRAHAT: '/absensi/selesai-istirahat',
};

export const NetworkManager = () => {
  const token = useAuthStore(s => s.token);
  const client = useQueryClient();
  const syncing = useRef(false);
  const [offline, setOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingAbsensi().then(pending => setPendingCount(pending.length));

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
      if (token && state.isConnected && state.isInternetReachable !== false) {
        syncPendingData();
      }
    });

    const timer = setInterval(() => { getPendingAbsensi().then(pending => setPendingCount(pending.length)); }, 5000);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [token]);

  const syncPendingData = async () => {
    if (!token || syncing.current) return;
    syncing.current = true;
    const pendingData = await getPendingAbsensi();
    if (pendingData.length === 0) { syncing.current = false; return; }

    setIsSyncing(true);
    setPendingCount(pendingData.length);

    for (const item of pendingData) {
      try {
        const endpoint = ENDPOINT_MAP[item.jenis];
        if (!endpoint) {
          await markAbsensiFailed(item.id);
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

        await markAbsensiSynced(item.id);
      } catch (error: any) {
        console.log(`Gagal sinkronisasi data id ${item.id}:`, error);
        const status = error?.response?.status;
        // Jika ditolak permanen oleh validasi server (4xx selain 408/429), tandai gagal agar antrean berikutnya tidak tersumbat
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          await markAbsensiFailed(item.id);
          continue;
        }
        // Masalah jaringan / server 5xx -> hentikan sementara dan coba lagi saat koneksi pulih
        break;
      }
    }

    const sisa = await getPendingAbsensi();
    setPendingCount(sisa.length);
    setIsSyncing(false);
    syncing.current = false;
    client.invalidateQueries({ queryKey: ['absensi'] });
  };

  if (!token || (pendingCount === 0 && !isSyncing && !offline)) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        {isSyncing
          ? `Menyelaraskan ${pendingCount} data tertunda...`
          : pendingCount ? `${pendingCount} absensi tersimpan di HP, belum terkirim` : 'Sedang offline · data terakhir ditampilkan'}
      </Text>
      {pendingCount > 0 && <TouchableOpacity disabled={isSyncing} onPress={syncPendingData} style={{minHeight:48,justifyContent:'center'}} accessibilityRole="button"><Text style={{color:'#745510',fontWeight:'700'}}>{isSyncing ? 'Mengirim…' : 'Coba kirim'}</Text></TouchableOpacity>}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF2D2',
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


