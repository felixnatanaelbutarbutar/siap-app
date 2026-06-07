import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const LoginScreen = () => {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading, error } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleLogin = async () => {
    if (!nik || !password) return;
    await login(nik, password);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logoText}>SIAP.</Text>
          <Text style={styles.subtitle}>SISTEM INFORMASI ABSENSI PEGAWAI</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>MASUK KE AKUN ANDA</Text>

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
              activeUnderlineColor="#111111"
              theme={{ colors: { primary: '#111111', background: '#f5f5f5' } }}
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
              activeUnderlineColor="#111111"
              theme={{ colors: { primary: '#111111', background: '#f5f5f5' } }}
              right={
                <TextInput.Icon 
                  icon={showPassword ? 'eye-off' : 'eye'} 
                  onPress={() => setShowPassword(!showPassword)}
                  color="#111111"
                />
              }
            />
          </View>

          <TouchableOpacity 
            style={[styles.buttonPrimary, (!nik || !password) && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={!nik || !password || isLoading}
            activeOpacity={0.5}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>MASUK</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 SIAP SYSTEM</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -2,
    lineHeight: 70,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#707072',
    letterSpacing: 1,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 24,
    letterSpacing: 0,
  },
  inputWrapper: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    height: 60,
  },
  buttonPrimary: {
    backgroundColor: '#111111',
    borderRadius: 30,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#cacacb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: '#d30005',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9e9ea0',
    letterSpacing: 1,
  },
});
