import React from 'react';
import { View, StyleSheet, ScrollView, Alert, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import { api } from '../../services/api';
import { useMutation } from '@tanstack/react-query';

export const ProfilScreen = () => {
  const { user, logout, updateFotoProfil } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (fotoUri: string) => {
      const formData = new FormData();
      const filename = fotoUri.split('/').pop() || 'profile.jpg';
      const finalUri = fotoUri.startsWith('file://') ? fotoUri : `file://${fotoUri}`;

      formData.append('foto', {
        uri: finalUri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      const res = await api.put('/admin/staff/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.foto_profil) {
        updateFotoProfil(data.foto_profil);
        Alert.alert('SUKSES', 'Foto profil berhasil diperbarui.');
      }
    },
    onError: (error) => {
      console.log('Upload foto error:', error);
      Alert.alert('GAGAL', 'Gagal mengunggah foto profil.');
    }
  });

  const handlePilihFoto = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) return;
      const uri = response.assets[0].uri;
      if (uri) mutation.mutate(uri);
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
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <Icon name={icon} size={24} color="#111111" />
      <Text style={styles.actionRowLabel}>{label}</Text>
      <Icon name="chevron-right" size={24} color="#111111" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>PROFIL</Text>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handlePilihFoto} style={styles.avatarContainer}>
            {user?.foto_profil ? (
              <Image source={{ uri: `http://localhost:9000/siap-storage/${user.foto_profil}` }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{user?.nama?.substring(0, 2).toUpperCase() || 'SI'}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Icon name="camera-plus" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.nama}</Text>
          <Text style={styles.userRole}>{user?.role} • {user?.divisi}</Text>
          <Text style={styles.userNik}>NIK: {user?.nik}</Text>
        </View>

        <View style={styles.pdpDisclosureRow}>
          <ActionRow icon="account-details-outline" label="Informasi Pribadi" onPress={() => {}} />
          <ActionRow icon="lock-outline" label="Ubah Kata Sandi" onPress={() => {}} />
          <ActionRow icon="help-circle-outline" label="Pusat Bantuan" onPress={() => {}} />
          <ActionRow icon="information-outline" label="Tentang Aplikasi" onPress={() => {}} />
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>KELUAR</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>SIAP SYSTEM V1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -1,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111111',
  },
  editBadge: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    backgroundColor: '#111111',
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
    color: '#111111',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    fontWeight: '700',
    color: '#707072',
    marginBottom: 8,
  },
  userNik: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9e9ea0',
  },
  pdpDisclosureRow: {
    paddingTop: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginLeft: 16,
  },
  logoutSection: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 30, // Nike pill shape
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9e9ea0',
    letterSpacing: 1,
  },
});
