import { cancelAllLaporanReminders } from './src/services/laporanReminder';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './src/services/queryClient';
import { initDatabase } from './src/store/database';
import { requestUserPermission, NotificationListener } from './src/services/fcm';
import { syncShiftReminders, cancelShiftReminders } from './src/services/shiftReminder';
import { socketService } from './src/services/socket';
import { NetworkManager } from './src/components/NetworkManager';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import Toast from 'react-native-toast-message';
import { useAuthStore } from './src/store/auth.store';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#006e2f', // Hijau utama dari DESIGN_MOBILE.md
    accent: '#007d48',
    background: '#f3fcef',
    surface: '#ffffff',
    text: '#161d16',
  },
};

export default function App() {
  const token = useAuthStore(state => state.token);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    void cancelAllLaporanReminders();
    if (token) {
      void requestUserPermission();
      void syncShiftReminders({ force: true, allowPrompt: true });
      socketService.connect();
      socketService.startLiveTracking();
    } else {
      void cancelShiftReminders();
      socketService.disconnect();
    }
  }, [token]);
  useEffect(() => {
    initDatabase();
    const unsubscribeFCM = NotificationListener();

    // AppState Listener untuk Live Tracking Socket.io & sinkronisasi pengingat shift
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevState === 'background' && nextAppState === 'active') {
        socketService.connect();
        socketService.startLiveTracking();
        void syncShiftReminders({ allowPrompt: false });
      } else if (nextAppState === 'background') {
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
