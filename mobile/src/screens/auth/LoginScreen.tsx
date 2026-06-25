import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!nik || !password) return;
    await login(nik, password);
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION (DYNAMIC GREEN) */}
      <Animated.View style={[styles.headerPanel, { opacity: logoAnim }]}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>SIAP.</Text>
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
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 SIAP PROFESSIONAL MOBILITY</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // surface-container-lowest
  },
  headerPanel: {
    backgroundColor: '#006e2f', // primary
    height: '40%',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    paddingHorizontal: 32,
    marginTop: -40, // push up slightly
  },
  logoText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff', // on-primary
    letterSpacing: -2,
    lineHeight: 70,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ae176', // inverse-primary for good contrast
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
    backgroundColor: '#4ae176', // light green accent wave
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
    backgroundColor: '#ffffff', // main white background coming up
    borderTopRightRadius: 200,
    borderTopLeftRadius: 150,
    transform: [{ rotate: '3deg' }],
  },
  formSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingTop: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
    zIndex: 2,
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#161d16', // on-surface
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  inputWrapper: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3fcef', // surface
    borderWidth: 1,
    borderColor: '#dce5d9', // surface-variant
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 16,
    height: 64,
    paddingHorizontal: 8,
  },
  buttonPrimary: {
    backgroundColor: '#515f74', // secondary (slate-gray)
    borderRadius: 12, // rounded-md
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    elevation: 3,
    shadowColor: '#515f74',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: '#bccbb9', // outline-variant
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#ffffff', // on-secondary
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: '#ba1a1a', // error
    marginBottom: 20,
    fontWeight: '600',
    fontSize: 14,
    backgroundColor: '#ffdad6', // error-container
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6d7b6c', // outline
    letterSpacing: 1,
  },
});
