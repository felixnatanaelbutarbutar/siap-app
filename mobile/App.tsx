import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './src/services/queryClient';
import { initDatabase } from './src/store/database';
import { requestUserPermission, NotificationListener } from './src/services/fcm';
import { socketService } from './src/services/socket';
import { NetworkManager } from './src/components/NetworkManager';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import Toast from 'react-native-toast-message';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#111111', // Pure black dari DESIGN.md
    accent: '#707072', // Mute gray
    background: '#ffffff',
    surface: '#f5f5f5', // Soft cloud
    text: '#111111',
  },
};

export default function App() {
  useEffect(() => {
    initDatabase();
    requestUserPermission();
    const unsubscribeFCM = NotificationListener();

    // AppState Listener untuk Live Tracking Socket.io
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        socketService.connect();
        socketService.startLiveTracking();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        socketService.stopLiveTracking();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (unsubscribeFCM) unsubscribeFCM();
      subscription.remove();
      socketService.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'left']}>
            <NetworkManager />
            <PaperProvider theme={theme}>
              <RootNavigator />
            </PaperProvider>
          </SafeAreaView>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
      <Toast />
    </ErrorBoundary>
  );
}
