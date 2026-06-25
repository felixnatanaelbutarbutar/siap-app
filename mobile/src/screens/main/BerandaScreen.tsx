import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, Dimensions, Modal, ActivityIndicator, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getAvatarUrl } from '../../utils/url';

type RootStackParamList = {
  Absensi: undefined;
  Laporan: undefined;
  SerahTerimaModal: undefined;
  IzinCuti: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export const BerandaScreen = () => {
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<NavigationProp>();
  const [showPengumuman, setShowPengumuman] = React.useState(false);

  // Entrance animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Notif dot blink
  const notifBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(contentAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
          Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // (SOS animation removed — replaced by Izin/Cuti)

    // Blink notif dot
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(notifBlink, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(notifBlink, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    blinkLoop.start();

    return () => {
      blinkLoop.stop();
    };
  }, []);

  const { data: pengumumanData, isLoading: loadingPengumuman, refetch: refetchPengumuman } = useQuery({
    queryKey: ['pengumuman'],
    queryFn: async () => {
      const res = await api.get('/pengumuman');
      return res.data.data;
    }
  });

  const { data: jadwalHariIni } = useQuery({
    queryKey: ['jadwal-hari-ini'],
    queryFn: async () => {
      const res = await api.get('/absensi/jadwal-hari-ini');
      return res.data.data;
    }
  });

  const handleOpenPengumuman = () => {
    refetchPengumuman();
    setShowPengumuman(true);
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* GREEN HEADER BACKDROP */}
        <Animated.View style={[styles.greenHeaderWrapper, { opacity: headerAnim }]}>
          <View style={styles.greenHeaderContent}>

            {/* Top Bar (Avatar & Welcome) */}
            <View style={styles.topBar}>
              <View style={styles.userInfoRow}>
                {user?.foto_profil ? (
                  <Image source={{ uri: getAvatarUrl(user.foto_profil) || undefined }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{user?.nama?.substring(0, 2).toUpperCase() || 'SI'}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.greetingLabel}>SELAMAT DATANG</Text>
                  <Text style={styles.greetingText}>{user?.nama?.split(' ')[0] || 'Pengguna'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.bellIconBtn} onPress={handleOpenPengumuman} activeOpacity={0.7}>
                <Icon name="bullhorn-outline" size={24} color="#ffffff" />
                {pengumumanData && pengumumanData.length > 0 && (
                  <Animated.View style={[styles.notifDot, { opacity: notifBlink }]} />
                )}
              </TouchableOpacity>
            </View>

            {/* FLOATING STATUS CARD */}
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusCardLabel}>STATUS HARI INI</Text>
                {jadwalHariIni ? (
                  <View style={styles.shiftBadge}>
                    <Icon name="clock-outline" size={14} color="#ba1a1a" style={{ marginRight: 4 }} />
                    <Text style={styles.shiftBadgeText}>
                      {jadwalHariIni.jam_masuk} - {jadwalHariIni.jam_keluar}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.shiftBadge, { backgroundColor: '#e8f0e4' }]}>
                    <Icon name="calendar-remove" size={14} color="#515f74" style={{ marginRight: 4 }} />
                    <Text style={[styles.shiftBadgeText, { color: '#515f74' }]}>Libur</Text>
                  </View>
                )}
              </View>

              <Text style={styles.statusTitle}>
                {jadwalHariIni ? 'Belum Absen Masuk' : 'Tidak ada shift hari ini'}
              </Text>

              <View style={styles.locationBox}>
                <Icon name="map-marker" size={24} color="#006e2f" style={styles.locationIcon} />
                <View>
                  <Text style={styles.locationTitle}>{user?.area_tugas?.nama || 'Pos Jaga Utama'}</Text>
                  <Text style={styles.locationSubtitle}>Gedung Sudirman Tower</Text>
                </View>
              </View>
            </View>

          </View>
        </Animated.View>

        {/* QUICK ACTIONS */}
        <Animated.View style={[styles.sectionContainer, { opacity: contentOpacity, transform: [{ translateY: contentAnim }] }]}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>

          <View style={styles.gridContainer}>
            {/* Action 1: Absensi */}
            <TouchableOpacity activeOpacity={0.75} style={[styles.gridItem, styles.gridItemWhite]} onPress={() => navigation.navigate('Absensi')}>
              <View style={[styles.iconCircle, { backgroundColor: '#006e2f' }]}>
                <Icon name="fingerprint" size={32} color="#ffffff" />
              </View>
              <Text style={styles.gridItemText}>Absensi</Text>
            </TouchableOpacity>

            {/* Action 2: Laporan Patroli */}
            <TouchableOpacity activeOpacity={0.75} style={[styles.gridItem, styles.gridItemSurface]} onPress={() => navigation.navigate('Laporan')}>
              <View style={[styles.iconCircle, { backgroundColor: '#dce5d9' }]}>
                <Icon name="clipboard-text-outline" size={28} color="#515f74" />
              </View>
              <Text style={styles.gridItemText}>Laporan Patroli</Text>
            </TouchableOpacity>

            {/* Action 3: Serah Terima / Jadwal Izin */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.gridItem, styles.gridItemWhite]}
              onPress={() => user?.role === 'SATPAM' ? navigation.navigate('SerahTerimaModal') : navigation.navigate('IzinCuti')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#e8f0e4' }]}>
                <Icon name="calendar-month-outline" size={28} color="#6d7b6c" />
              </View>
              <Text style={styles.gridItemText}>
                {user?.role === 'SATPAM' ? 'Serah Terima' : 'Jadwal / Izin'}
              </Text>
            </TouchableOpacity>

            {/* Action 4: Izin / Cuti */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.gridItem, styles.gridItemIzin, { width: '48%' }]}
              onPress={() => navigation.navigate('IzinCuti')}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Icon name="calendar-check-outline" size={32} color="#ffffff" />
              </View>
              <Text style={[styles.gridItemText, { color: '#ffffff' }]}>Izin / Cuti</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* RECENT ACTIVITIES */}
        <Animated.View style={[styles.sectionContainer, { opacity: contentOpacity, transform: [{ translateY: contentAnim }] }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Aktivitas Terakhir</Text>
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {/* Activity Item 1 */}
            <View style={styles.activityItem}>
              <View style={[styles.activityIconBox, { backgroundColor: '#e8f0e4' }]}>
                <Icon name="login-variant" size={24} color="#6d7b6c" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>Absen Pulang</Text>
                <Text style={styles.activityTime}>Kemarin, 17:05</Text>
              </View>
              <View style={styles.statusBadgeGreen}>
                <Text style={styles.statusBadgeGreenText}>Tepat Waktu</Text>
              </View>
            </View>
            
            <View style={styles.divider} />

            {/* Activity Item 2 */}
            <View style={styles.activityItem}>
              <View style={[styles.activityIconBox, { backgroundColor: '#dce5d9' }]}>
                <Icon name="clipboard-check-outline" size={24} color="#515f74" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>Laporan Patroli Selesai</Text>
                <Text style={styles.activityTime}>Kemarin, 15:30</Text>
              </View>
              <View style={styles.statusBadgeGray}>
                <Text style={styles.statusBadgeGrayText}>Area Utara</Text>
              </View>
            </View>

          </View>
        </Animated.View>

      </ScrollView>

      {/* PENGUMUMAN MODAL */}
      <Modal visible={showPengumuman} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pengumuman Global</Text>
              <TouchableOpacity onPress={() => setShowPengumuman(false)}>
                <Icon name="close" size={24} color="#161d16" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {loadingPengumuman ? (
                <ActivityIndicator size="large" color="#006e2f" style={{ marginTop: 40 }} />
              ) : pengumumanData && pengumumanData.length > 0 ? (
                pengumumanData.map((item: any) => (
                  <View key={item.id} style={styles.pengumumanCard}>
                    <View style={styles.pengumumanHeaderRow}>
                      <View style={[styles.pengumumanBadge, item.tipe === 'PENTING' ? { backgroundColor: '#ba1a1a' } : item.tipe === 'UPDATE' ? { backgroundColor: '#515f74' } : {}]}>
                        <Text style={styles.pengumumanBadgeText}>{item.tipe}</Text>
                      </View>
                      <Text style={styles.pengumumanDate}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
                    </View>
                    <Text style={styles.pengumumanTitle}>{item.judul}</Text>
                    <Text style={styles.pengumumanText}>{item.konten}</Text>
                    <Text style={styles.pengumumanAuthor}>Oleh: {item.admin?.nama}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Belum ada pengumuman.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#006e2f', // match top bar
  },
  container: {
    flex: 1,
    backgroundColor: '#f3fcef', // surface
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  greenHeaderWrapper: {
    backgroundColor: '#f3fcef', // backdrop behind the curve
  },
  greenHeaderContent: {
    backgroundColor: '#006e2f',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100, // extra space for floating card
    position: 'relative',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0e4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#006e2f',
  },
  greetingLabel: {
    color: '#a5e8b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 12,
  },
  greetingText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  bellIconBtn: {
    position: 'relative',
    padding: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: width - 48,
    alignSelf: 'center',
    position: 'absolute',
    bottom: -60, // float effect
    elevation: 4,
    shadowColor: '#161d16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#515f74',
    letterSpacing: 0.5,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shiftBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#161d16',
    marginBottom: 16,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3fcef',
    padding: 12,
    borderRadius: 12,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161d16',
  },
  locationSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6d7b6c',
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginTop: 80, // compensate for floating card
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#161d16',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006e2f',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#161d16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  gridItemWhite: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8f0e4',
  },
  gridItemSurface: {
    backgroundColor: '#e8f0e4',
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  gridItemIzin: {
    backgroundColor: '#0067a0',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161d16',
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8f0e4',
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161d16',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6d7b6c',
  },
  statusBadgeGreen: {
    backgroundColor: '#e8f0e4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006e2f',
  },
  statusBadgeGray: {
    backgroundColor: '#f3fcef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  statusBadgeGrayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#515f74',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8f0e4',
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22,29,22,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f3fcef',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#161d16',
  },
  modalBody: {
    flex: 1,
  },
  pengumumanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  pengumumanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pengumumanBadge: {
    backgroundColor: '#6d7b6c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pengumumanBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  pengumumanDate: {
    fontSize: 12,
    color: '#6d7b6c',
    fontWeight: '500',
  },
  pengumumanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161d16',
    marginBottom: 8,
  },
  pengumumanText: {
    fontSize: 14,
    color: '#3d4a3d',
    lineHeight: 20,
    marginBottom: 12,
  },
  pengumumanAuthor: {
    fontSize: 12,
    color: '#6d7b6c',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6d7b6c',
  }
});
