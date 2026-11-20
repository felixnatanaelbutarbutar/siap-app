import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Animated, Image, Modal } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { getApiBaseUrl, setApiBaseUrl, initApiBaseUrl, DEFAULT_SERVER_URL } from '../../services/api';
import { socketService } from '../../services/socket';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [currentServer, setCurrentServer] = useState(getApiBaseUrl());
  const [showServerModal, setShowServerModal] = useState(false);
  const [inputServer, setInputServer] = useState(getApiBaseUrl());

  const { login, isLoading, error } = useAuthStore();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initApiBaseUrl().then((url) => {
      setCurrentServer(url);
      setInputServer(url);
    });
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [formAnim, formOpacity, logoAnim]);

  const handleLogin = async () => {
    if (!nik || !password) return;
    await login(nik, password);
  };

  const handleSaveServer = async () => {
    try {
      const saved = await setApiBaseUrl(inputServer);
      setCurrentServer(saved);
      socketService.reconnect();
      setShowServerModal(false);
      Toast.show({
        type: 'success',
        text1: 'Alamat Server Diperbarui',
        text2: saved,
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Gagal Menyimpan Alamat Server',
      });
    }
  };

  const handleResetServer = async () => {
    try {
      const saved = await setApiBaseUrl(DEFAULT_SERVER_URL);
      setCurrentServer(saved);
      setInputServer(saved);
      socketService.reconnect();
      setShowServerModal(false);
      Toast.show({
        type: 'info',
        text1: 'Reset ke Default',
        text2: saved,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION (DYNAMIC GREEN) */}
      <Animated.View style={[styles.headerPanel, { opacity: logoAnim }]}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/logo-white.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>SISTEM INFORMASI ABSENSI PEGAWAI</Text>
        </View>
        
        {/* 3D WAVE SEPARATOR (Double Wave Illusion via Absolute Circles) */}
        <View style={styles.waveWrapper}>
          <View style={styles.waveBack} />
          <View style={styles.waveFront} />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.formSection}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formAnim }] }]}>
          <Text style={styles.formTitle}>Masuk ke Akun Anda</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              label="Nomor Induk Karyawan (NIK)"
              value={nik}
              onChangeText={setNik}
              keyboardType="number-pad"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#006e2f"
              textColor="#161d16"
              theme={{ colors: { primary: '#006e2f', background: '#f3fcef', onSurfaceVariant: '#3d4a3d' } }}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              label="Kata Sandi"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#006e2f"
              textColor="#161d16"
              theme={{ colors: { primary: '#006e2f', background: '#f3fcef', onSurfaceVariant: '#3d4a3d' } }}
              right={
                <TextInput.Icon 
                  icon={showPassword ? 'eye-off' : 'eye'} 
                  onPress={() => setShowPassword(!showPassword)}
                  color="#515f74"
                />
              }
            />
          </View>

          <TouchableOpacity
            style={[styles.buttonPrimary, (!nik || !password) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!nik || !password || isLoading}
            activeOpacity={0.75}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>MASUK</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverConfigBtn}
            onPress={() => {
              setInputServer(currentServer);
              setShowServerModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.serverConfigLabel}>Server Host:</Text>
            <Text style={styles.serverConfigVal} numberOfLines={1}>{currentServer}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* MODAL CONFIG SERVER */}
      <Modal visible={showServerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alamat Server Laptop</Text>
            <Text style={styles.modalDesc}>
              Masukkan IP laptop server saat ini (misal di Wi-Fi kantor atau Hotspot HP Anda).
            </Text>
            <TextInput
              mode="outlined"
              label="Alamat URL Server"
              value={inputServer}
              onChangeText={setInputServer}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ backgroundColor: '#ffffff', marginBottom: 18 }}
              outlineColor="#cfdcce"
              activeOutlineColor="#006e2f"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={handleResetServer}>
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowServerModal(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveServer}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerPanel: {
    backgroundColor: '#006e2f',
    height: '38%',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: 32,
    marginTop: -30,
  },
  logoImage: {
    width: 210,
    height: 64,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ae176',
    letterSpacing: 1,
    marginTop: 8,
  },
  waveWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 60,
    overflow: 'hidden',
  },
  waveBack: {
    position: 'absolute',
    bottom: -30,
    left: -50,
    width: width * 1.5,
    height: 100,
    backgroundColor: '#4ae176',
    borderTopRightRadius: 200,
    borderTopLeftRadius: 100,
    transform: [{ rotate: '-5deg' }],
    opacity: 0.5,
  },
  waveFront: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: width * 1.5,
    height: 100,
    backgroundColor: '#ffffff',
    borderTopRightRadius: 200,
    borderTopLeftRadius: 150,
    transform: [{ rotate: '3deg' }],
  },
  formSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingTop: 16,
    justifyContent: 'center',
    paddingBottom: 24,
    zIndex: 2,
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#161d16',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  inputWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3fcef',
    borderWidth: 1,
    borderColor: '#dce5d9',
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 16,
    height: 60,
    paddingHorizontal: 8,
  },
  buttonPrimary: {
    backgroundColor: '#006e2f',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#006e2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: '#bccbb9',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  serverConfigBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f5ee',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1eade',
  },
  serverConfigLabel: {
    fontSize: 12,
    color: '#556255',
    marginRight: 6,
    fontWeight: '600',
  },
  serverConfigVal: {
    fontSize: 12,
    color: '#006e2f',
    fontWeight: '700',
    maxWidth: '70%',
  },
  errorText: {
    color: '#ba1a1a',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 14,
    backgroundColor: '#ffdad6',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161d16',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#556255',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalResetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f1f3f1',
    borderRadius: 8,
  },
  modalResetText: {
    fontSize: 13,
    color: '#ba1a1a',
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#556255',
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#006e2f',
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
