import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/auth.store';

import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export const RootNavigator = () => {
  const { token, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/logo-emerald.png')}
          style={styles.bootLogo}
          resizeMode="contain"
        />
        <Text style={styles.bootSubtitle}>SISTEM INFORMASI ABSENSI PEGAWAI</Text>
        <ActivityIndicator size="large" color="#006e2f" style={styles.bootSpinner} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3fcef',
    paddingHorizontal: 32,
  },
  bootLogo: {
    width: 180,
    height: 54,
    marginBottom: 10,
  },
  bootSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3d4a3d',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  bootSpinner: {
    marginTop: 28,
  },
});
