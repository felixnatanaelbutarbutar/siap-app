import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Absensi: undefined;
  Laporan: undefined;
  SerahTerimaModal: undefined;
  IzinCuti: undefined; // Add this route
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BerandaScreen = () => {
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<NavigationProp>();

  const ActionCard = ({ title, subtitle, icon, onPress }: { title: string, subtitle: string, icon: string, onPress: () => void }) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.actionIconPill}>
        <Icon name={icon} size={24} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} bounces={false}>
        {/* TOP SECTION: CAMPAIGN HERO */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>SIAP.</Text>
          <TouchableOpacity style={styles.notifIcon}>
            <Icon name="bell-outline" size={24} color="#111111" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            {user?.foto_profil ? (
              <Image source={{ uri: `http://localhost:9000/siap-storage/${user.foto_profil}` }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{user?.nama?.substring(0, 2).toUpperCase() || 'SI'}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.nama || 'Pengguna'}</Text>
              <Text style={styles.roleText}>{user?.role} • {user?.divisi}</Text>
            </View>
          </View>
          
          <View style={styles.shiftRow}>
            <View>
              <Text style={styles.shiftLabel}>JADWAL SHIFT</Text>
              <Text style={styles.shiftValue}>08:00 - 17:00</Text>
            </View>
            <View>
              <Text style={styles.shiftLabel}>STATUS</Text>
              <Text style={styles.shiftValueActive}>BELUM ABSEN</Text>
            </View>
          </View>
        </View>

        {/* ACTION GRID */}
        <View style={styles.actionGrid}>
          <Text style={styles.sectionTitle}>AKSES CEPAT</Text>
          
          <ActionCard 
            title="ABSENSI" 
            subtitle="Rekam kehadiran shift"
            icon="fingerprint" 
            onPress={() => navigation.navigate('Absensi')} 
          />
          <ActionCard 
            title="IZIN / CUTI" 
            subtitle="Pengajuan ketidakhadiran"
            icon="calendar-blank-outline" 
            onPress={() => navigation.navigate('IzinCuti')} 
          />
          <ActionCard 
            title="LAPORAN" 
            subtitle="Buat laporan aktivitas"
            icon="file-document-edit-outline" 
            onPress={() => navigation.navigate('Laporan')} 
          />
          {(user?.role === 'SATPAM' || user?.role === 'UTILITY') && (
            <ActionCard 
              title="SERAH TERIMA" 
              subtitle="Operasional pergantian shift"
              icon="handshake-outline" 
              onPress={() => navigation.navigate('SerahTerimaModal')} 
            />
          )}
        </View>

        {/* ANNOUNCEMENT CARD */}
        <View style={styles.announcementSection}>
          <Text style={styles.sectionTitle}>PENGUMUMAN</Text>
          <View style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <Icon name="bullhorn-outline" size={20} color="#111111" />
              <Text style={styles.announcementDate}>HARI INI</Text>
            </View>
            <Text style={styles.announcementTitle}>PEMBARUAN SISTEM</Text>
            <Text style={styles.announcementText}>Fitur absensi kini lebih akurat dengan deteksi lokasi tingkat lanjut. Pastikan GPS selalu menyala.</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 SIAP SYSTEM</Text>
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
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -2,
  },
  notifIcon: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d30005', // Nike Sale Red
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  profileSection: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5', // Hairline soft
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 0, // Brutalist zero radius for images
    backgroundColor: '#f5f5f5',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    textTransform: 'uppercase',
  },
  roleText: {
    fontSize: 14,
    color: '#707072',
    fontWeight: '600',
    marginTop: 4,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  shiftLabel: {
    fontSize: 12,
    color: '#707072',
    fontWeight: '700',
    marginBottom: 4,
  },
  shiftValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  shiftValueActive: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d30005', // Nike Red for attention
  },
  actionGrid: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 20,
    marginBottom: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#707072',
  },
  actionIconPill: {
    width: 48,
    height: 48,
    borderRadius: 24, // Pill shape
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementSection: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  announcementCard: {
    backgroundColor: '#111111',
    padding: 24,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24, // Pill
  },
  announcementDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111111',
    marginLeft: 8,
  },
  announcementTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  announcementText: {
    fontSize: 14,
    color: '#cacacb',
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9e9ea0',
    letterSpacing: 1,
  },
});
