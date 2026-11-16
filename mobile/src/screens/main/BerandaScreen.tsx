import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, Dimensions, Modal, ActivityIndicator, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getAvatarUrl } from '../../utils/url';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
  const [showPengumuman, setShowPengumuman] = useState(false);
  const [showJadwalMingguan, setShowJadwalMingguan] = useState(false);

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
  }, [contentAnim, contentOpacity, headerAnim, notifBlink]);

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

  const { data: absensiHariIni } = useQuery({
    queryKey: ['absensi', 'hari-ini'],
    queryFn: async () => {
      const res = await api.get('/absensi/hari-ini');
      return res.data.data || [];
    }
  });

  const { data: laporanTerbaru } = useQuery({
    queryKey: ['laporan', 'terbaru'],
    queryFn: async () => {
      const res = await api.get('/laporan');
      return res.data.data || [];
    }
  });

  const { data: jadwalMingguan, isLoading: loadingJadwalMingguan, refetch: refetchJadwalMingguan } = useQuery({
    queryKey: ['jadwal-mingguan'],
    queryFn: async () => {
      const res = await api.get('/absensi/jadwal-mingguan');
      return res.data.data || [];
    },
    enabled: showJadwalMingguan,
  });

  const handleOpenPengumuman = () => {
    refetchPengumuman();
    setShowPengumuman(true);
  };

  const handleOpenJadwalMingguan = () => {
    refetchJadwalMingguan();
    setShowJadwalMingguan(true);
  };

  // Status Kehadiran Realtime
  const sudahMasuk = Array.isArray(absensiHariIni) && absensiHariIni.some((a: any) => a.jenis === 'MASUK');
  const sudahKeluar = Array.isArray(absensiHariIni) && absensiHariIni.some((a: any) => a.jenis === 'KELUAR');
  const countMulaiIstirahat = Array.isArray(absensiHariIni)
    ? absensiHariIni.filter((a: any) => a.jenis === 'MULAI_ISTIRAHAT').length
    : 0;
  const countSelesaiIstirahat = Array.isArray(absensiHariIni)
    ? absensiHariIni.filter((a: any) => a.jenis === 'SELESAI_ISTIRAHAT').length
    : 0;
  const sedangIstirahat = countMulaiIstirahat > countSelesaiIstirahat;

  let statusBadgeLabel = 'Shift Hari Ini';
  let statusBadgeColor = '#ba1a1a';
  let statusBadgeBg = '#ffdad6';
  let statusTitle = 'Belum Absen Masuk';

  if (!jadwalHariIni) {
    statusBadgeLabel = 'Libur';
    statusBadgeColor = '#515f74';
    statusBadgeBg = '#e8f0e4';
    statusTitle = 'Tidak ada shift hari ini';
  } else if (sudahKeluar) {
    statusBadgeLabel = 'Shift Selesai';
    statusBadgeColor = '#006e2f';
    statusBadgeBg = '#cdeed5';
    statusTitle = 'Tugas shift hari ini telah selesai';
  } else if (sedangIstirahat) {
    statusBadgeLabel = 'Sedang Istirahat';
    statusBadgeColor = '#c77800';
    statusBadgeBg = '#ffefd4';
    statusTitle = 'Waktu istirahat aktif';
  } else if (sudahMasuk) {
    statusBadgeLabel = 'Shift Aktif';
    statusBadgeColor = '#006e2f';
    statusBadgeBg = '#cdeed5';
    statusTitle = 'Sedang bertugas di area';
  }

  // Gabungkan aktivitas absensi & laporan harian
  const combinedActivities = useMemo(() => {
    const list: any[] = [];

    if (Array.isArray(absensiHariIni)) {
      absensiHariIni.forEach((item: any) => {
        let title = 'Absensi';
        let icon = 'fingerprint';
        let iconBg = '#e8f0e4';
        let iconColor = '#006e2f';
        let badge = item.status_kehadiran === 'TERLAMBAT' ? 'Terlambat' : 'Tepat Waktu';
        let badgeBg = item.status_kehadiran === 'TERLAMBAT' ? '#ffefd4' : '#e8f0e4';
        let badgeColor = item.status_kehadiran === 'TERLAMBAT' ? '#c77800' : '#006e2f';

        if (item.jenis === 'MASUK') {
          title = 'Absen Masuk';
          icon = 'login-variant';
        } else if (item.jenis === 'KELUAR') {
          title = 'Absen Pulang';
          icon = 'logout-variant';
          iconBg = '#ffdad6';
          iconColor = '#ba1a1a';
        } else if (item.jenis === 'MULAI_ISTIRAHAT') {
          title = 'Mulai Istirahat';
          icon = 'coffee-outline';
          iconBg = '#ffefd4';
          iconColor = '#c77800';
          badge = 'Istirahat';
          badgeBg = '#ffefd4';
          badgeColor = '#c77800';
        } else if (item.jenis === 'SELESAI_ISTIRAHAT') {
          title = 'Selesai Istirahat';
          icon = 'coffee';
          badge = 'Kembali Kerja';
        }

        list.push({
          id: `abs-${item.id}`,
          timestamp: new Date(item.waktu_server).getTime(),
          timeText: `Hari ini, ${format(new Date(item.waktu_server), 'HH:mm')}`,
          title,
          icon,
          iconBg,
          iconColor,
          badge,
          badgeBg,
          badgeColor,
        });
      });
    }

    if (Array.isArray(laporanTerbaru)) {
      laporanTerbaru.slice(0, 4).forEach((lap: any) => {
        const d = new Date(lap.created_at);
        const isToday = new Date().toDateString() === d.toDateString();
        const timeText = isToday
          ? `Hari ini, ${format(d, 'HH:mm')}`
          : format(d, 'd MMM, HH:mm', { locale: id });

        let badgeBg = '#e8f0e4';
        let badgeColor = '#515f74';
        if (lap.status === 'APPROVED') {
          badgeBg = '#cdeed5';
          badgeColor = '#006e2f';
        } else if (lap.status === 'REJECTED') {
          badgeBg = '#ffdad6';
          badgeColor = '#ba1a1a';
        }

        list.push({
          id: `lap-${lap.id}`,
          timestamp: d.getTime(),
          timeText,
          title: `Laporan: ${lap.judul}`,
          icon: 'clipboard-text-outline',
          iconBg: '#dce5d9',
          iconColor: '#515f74',
          badge: lap.status,
          badgeBg,
          badgeColor,
        });
      });
    }

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, 5);
  }, [absensiHariIni, laporanTerbaru]);

  const laporanActionLabel =
    user?.role === 'SATPAM'
      ? 'Laporan Patroli'
      : user?.role === 'CS'
      ? 'Laporan Layanan'
      : 'Laporan Fasilitas';

  const isEligibleSerahTerima = user?.role === 'SATPAM' || user?.role === 'UTILITY';

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

            {/* Brand Strip + Announcement Bell */}
            <View style={styles.brandBar}>
              <Image
                source={require('../../assets/logo-white.png')}
                style={styles.headerBrandLogo}
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.bellIconBtn} onPress={handleOpenPengumuman} activeOpacity={0.7}>
                <Icon name="bullhorn-outline" size={22} color="#ffffff" />
                {pengumumanData && pengumumanData.length > 0 && (
                  <Animated.View style={[styles.notifDot, { opacity: notifBlink }]} />
                )}
              </TouchableOpacity>
            </View>

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
            </View>

            {/* FLOATING STATUS CARD */}
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusCardLabel}>STATUS HARI INI</Text>
                {jadwalHariIni ? (
                  <View style={[styles.shiftBadge, { backgroundColor: statusBadgeBg }]}>
                    <Icon name="clock-outline" size={14} color={statusBadgeColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.shiftBadgeText, { color: statusBadgeColor }]}>
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

              <Text style={styles.statusTitle}>{statusTitle}</Text>

              <View style={styles.locationBox}>
                <Icon name="map-marker" size={24} color="#006e2f" style={styles.locationIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>{user?.area_tugas?.nama || 'Area Penugasan Belum Diatur'}</Text>
                  <Text style={styles.locationSubtitle}>
                    {user?.area_tugas?.radius_meter ? `Radius Validasi: ${user.area_tugas.radius_meter}m` : 'SIAP Smart Security & Facility'}
                  </Text>
                </View>
                {jadwalHariIni && (
                  <TouchableOpacity onPress={handleOpenJadwalMingguan} style={styles.btnMiniJadwal}>
                    <Text style={styles.btnMiniJadwalText}>Jadwal</Text>
                  </TouchableOpacity>
                )}
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

            {/* Action 2: Laporan */}
            <TouchableOpacity activeOpacity={0.75} style={[styles.gridItem, styles.gridItemSurface]} onPress={() => navigation.navigate('Laporan')}>
              <View style={[styles.iconCircle, { backgroundColor: '#dce5d9' }]}>
                <Icon name="clipboard-text-outline" size={28} color="#515f74" />
              </View>
              <Text style={styles.gridItemText}>{laporanActionLabel}</Text>
            </TouchableOpacity>

            {/* Action 3: Serah Terima (SATPAM & UTILITY) / Jadwal Kerja (CS) */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.gridItem, styles.gridItemWhite]}
              onPress={() => {
                if (isEligibleSerahTerima) {
                  navigation.navigate('SerahTerimaModal');
                } else {
                  handleOpenJadwalMingguan();
                }
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#e8f0e4' }]}>
                <Icon
                  name={isEligibleSerahTerima ? 'swap-horizontal' : 'calendar-month-outline'}
                  size={28}
                  color="#006e2f"
                />
              </View>
              <Text style={styles.gridItemText}>
                {isEligibleSerahTerima ? 'Serah Terima' : 'Jadwal Kerja'}
              </Text>
            </TouchableOpacity>

            {/* Action 4: Izin / Cuti */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.gridItem, styles.gridItemIzin]}
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
            <TouchableOpacity activeOpacity={0.6} onPress={() => navigation.navigate('Laporan')}>
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {combinedActivities.length > 0 ? (
              combinedActivities.map((act: any, idx: number) => (
                <React.Fragment key={act.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.activityItem}>
                    <View style={[styles.activityIconBox, { backgroundColor: act.iconBg }]}>
                      <Icon name={act.icon} size={22} color={act.iconColor} />
                    </View>
                    <View style={styles.activityBody}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{act.title}</Text>
                      <Text style={styles.activityTime}>{act.timeText}</Text>
                    </View>
                    <View style={[styles.statusBadgeCustom, { backgroundColor: act.badgeBg }]}>
                      <Text style={[styles.statusBadgeCustomText, { color: act.badgeColor }]}>{act.badge}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyActivityBox}>
                <Icon name="history" size={40} color="#bccbb9" />
                <Text style={styles.emptyActivityTitle}>Belum Ada Aktivitas Hari Ini</Text>
                <Text style={styles.emptyActivitySubtitle}>
                  Silakan lakukan absensi masuk untuk mencatat kehadiran dan memulai shift Anda.
                </Text>
                <TouchableOpacity
                  style={styles.btnMulaiAbsen}
                  onPress={() => navigation.navigate('Absensi')}
                >
                  <Text style={styles.btnMulaiAbsenText}>Buka Kamera Absen</Text>
                </TouchableOpacity>
              </View>
            )}
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

      {/* JADWAL KERJA MINGGUAN MODAL */}
      <Modal visible={showJadwalMingguan} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Jadwal Kerja Mingguan</Text>
                <Text style={styles.modalSubtitle}>Jadwal shift Anda dari Senin hingga Ahad</Text>
              </View>
              <TouchableOpacity onPress={() => setShowJadwalMingguan(false)}>
                <Icon name="close" size={24} color="#161d16" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {loadingJadwalMingguan ? (
                <ActivityIndicator size="large" color="#006e2f" style={{ marginTop: 40 }} />
              ) : jadwalMingguan && jadwalMingguan.length > 0 ? (
                jadwalMingguan.map((j: any) => (
                  <View key={j.id} style={[styles.jadwalCard, !j.aktif && styles.jadwalCardInactive]}>
                    <View style={styles.jadwalDayBadge}>
                      <Text style={styles.jadwalDayText}>{j.hari}</Text>
                    </View>
                    <View style={styles.jadwalInfo}>
                      <Text style={styles.jadwalHours}>
                        {j.aktif ? `${j.jam_masuk} — ${j.jam_keluar}` : 'Libur / Tidak Aktif'}
                      </Text>
                      <Text style={styles.jadwalArea}>{user?.area_tugas?.nama || 'Area Tugas Utama'}</Text>
                    </View>
                    <View style={[styles.jadwalStatusDot, { backgroundColor: j.aktif ? '#006e2f' : '#ba1a1a' }]} />
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Icon name="calendar-alert" size={48} color="#bccbb9" />
                  <Text style={styles.emptyText}>Belum ada jadwal mingguan yang dikonfigurasi admin.</Text>
                </View>
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
    paddingTop: 18,
    paddingBottom: 100, // extra space for floating card
    position: 'relative',
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerBrandLogo: {
    width: 88,
    height: 26,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ae176',
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
  },
  btnMiniJadwal: {
    backgroundColor: '#006e2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  btnMiniJadwalText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeCustom: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeCustomText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyActivityBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyActivityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#161d16',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyActivitySubtitle: {
    fontSize: 12,
    color: '#6d7b6c',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  btnMulaiAbsen: {
    backgroundColor: '#006e2f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  btnMulaiAbsenText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6d7b6c',
    marginTop: 2,
  },
  jadwalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dce5d9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  jadwalCardInactive: {
    backgroundColor: '#f6f9f5',
    borderColor: '#e8f0e4',
    opacity: 0.7,
  },
  jadwalDayBadge: {
    width: 68,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e8f0e4',
    alignItems: 'center',
    marginRight: 12,
  },
  jadwalDayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006e2f',
    letterSpacing: 0.5,
  },
  jadwalInfo: {
    flex: 1,
  },
  jadwalHours: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161d16',
    marginBottom: 2,
  },
  jadwalArea: {
    fontSize: 12,
    color: '#6d7b6c',
  },
  jadwalStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
