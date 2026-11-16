import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, SafeAreaView, TouchableOpacity, Image, Modal } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import { api } from '../../services/api';
import { useMutation } from '@tanstack/react-query';
import { getAvatarUrl } from '../../utils/url';
import { ProfilePanel } from '../../components/ProfilePanel';
import { checkedImageUri } from '../../utils/localImage';

export const ProfilScreen = () => {
  const { user, logout, updateFotoProfil } = useAuthStore();
  const [section, setSection] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (asset: ImagePicker.Asset) => {
      if (!asset.uri) throw new Error('Foto tidak dapat dibaca. Silakan pilih ulang.');
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('Ukuran foto maksimal 5 MB. Silakan pilih foto yang lebih kecil.');
      }
      const formData = new FormData();
      const finalUri = await checkedImageUri(asset.uri);
      const mime = asset.type || 'image/jpeg';
      const filename = asset.fileName || `profile.${mime === 'image/png' ? 'png' : 'jpg'}`;

      formData.append('foto', {
        uri: finalUri,
        name: filename,
        type: mime,
      } as any);

      const res = await api.put('/auth/profil/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (!res.data.data?.foto_profil) throw new Error('Server belum mengembalikan foto profil. Coba lagi.');
      return res.data.data;
    },
    onSuccess: (resData) => {
      const fotoUrl = resData?.data?.foto_profil || resData?.foto_profil;
      if (fotoUrl) {
        updateFotoProfil(fotoUrl);
        Alert.alert('SUKSES', 'Foto profil berhasil diperbarui.');
      } else {
        Alert.alert('SUKSES', 'Foto profil berhasil diperbarui.');
      }
    },
    onError: (error: any) => {
      console.log('Upload foto error:', error);
      Alert.alert('Gagal mengunggah foto', error.response?.data?.message || (error.message === 'Network Error' ? 'Periksa koneksi internet atau sambungan USB ke backend.' : error.message) || 'Silakan coba lagi.');
    }
  });

  const handlePilihFoto = () => {
    if (mutation.isPending) return;
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1200, maxHeight: 1200, selectionLimit: 1 }, (response) => {
      if (response.errorCode) {
        Alert.alert('Tidak dapat membuka galeri', response.errorMessage || 'Periksa izin foto aplikasi lalu coba lagi.');
        return;
      }
      if (response.didCancel || !response.assets || response.assets.length === 0) return;
      const uri = response.assets[0].uri;
      if (uri) mutation.mutate(response.assets[0]);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'KELUAR',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        { text: 'BATAL', style: 'cancel' },
        { text: 'KELUAR', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const ActionRow = ({ icon, label, onPress }: { icon: string, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.actionIconBox}>
        <Icon name={icon} size={20} color="#006e2f" />
      </View>
      <Text style={styles.actionRowLabel}>{label}</Text>
      <Icon name="chevron-right" size={20} color="#6d7b6c" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* <View style={styles.header}>
          <Text style={styles.pageTitle}>PROFIL</Text>
        </View> */}

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handlePilihFoto} style={styles.avatarContainer} disabled={mutation.isPending} accessibilityRole="button" accessibilityLabel="Ubah foto profil" accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending }}>
            {user?.foto_profil ? (
              <Image source={{ uri: getAvatarUrl(user.foto_profil) || undefined }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{user?.nama?.substring(0, 2).toUpperCase() || 'SI'}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              {mutation.isPending ? <ActivityIndicator size="small" color="#ffffff" /> : <Icon name="camera-plus" size={16} color="#ffffff" />}
            </View>
          </TouchableOpacity>
          {mutation.isPending && <Text accessibilityLiveRegion="polite">Mengunggah foto...</Text>}

          <Text style={styles.userName}>{user?.nama}</Text>
          <Text style={styles.userRole}>{user?.role} • {user?.divisi}</Text>
          <Text style={styles.userNik}>NIK: {user?.nik}</Text>
        </View>

        <View style={styles.pdpDisclosureRow}>
          <ActionRow icon="account-details-outline" label="Informasi Pribadi" onPress={() => setSection('Informasi Pribadi')} />
          <ActionRow icon="lock-outline" label="Ubah Kata Sandi" onPress={() => setSection('Ubah Kata Sandi')} />
          <ActionRow icon="help-circle-outline" label="Pusat Bantuan" onPress={() => setSection('Pusat Bantuan')} />
          <ActionRow icon="information-outline" label="Tentang Aplikasi" onPress={() => setSection('Tentang Aplikasi')} />
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>KELUAR</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Image
            source={require('../../assets/logo-emerald.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>SIAP SYSTEM V1.0.0</Text>
        </View>
      </ScrollView>
    <Modal visible={!!section} animationType="slide" onRequestClose={() => setSection(null)}>{section && <ProfilePanel section={section} onClose={() => setSection(null)} />}</Modal></SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#161d16',
    letterSpacing: -1,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f0e4',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f0e4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '800',
    color: '#161d16',
  },
  editBadge: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    backgroundColor: '#006e2f',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#161d16',
    
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3d4a3d',
    marginBottom: 8,
  },
  userNik: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6d7b6c',
  },
  pdpDisclosureRow: {
    paddingTop: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#dce5d9',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f0e4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#161d16',
    marginLeft: 16,
  },
  logoutSection: {
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 48,
  },
  logoutButton: {
    backgroundColor: '#F3F7F4',
    borderWidth: 2,
    borderColor: '#ba1a1a',
    borderRadius: 30, // Nike pill shape
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ba1a1a',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 8,
  },
  footerLogo: {
    width: 76,
    height: 22,
    opacity: 0.78,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6d7b6c',
    letterSpacing: 1,
  },
});

