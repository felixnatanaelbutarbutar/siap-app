import { getApps } from '@react-native-firebase/app';
import { getMessaging, requestPermission, AuthorizationStatus, getToken, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification } from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { api } from './api';

// Push notifications are optional in local builds without Firebase configuration.
const configuredMessaging = () => {
  const app = getApps().find(app => app.name === '[DEFAULT]');
  return app ? getMessaging(app) : null;
};
const saveToken = async (token: string) => {
  if (await EncryptedStorage.getItem('token')) await api.post('/auth/fcm-token', { fcm_token: token });
};
export const requestUserPermission = async () => {
  const messaging = configuredMessaging();
  if (!messaging) return;
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    const status = await requestPermission(messaging);
    if (status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL) {
      await saveToken(await getToken(messaging));
    }
  } catch (error) {
    console.log('Push notification registration failed:', error);
  }
};
export const NotificationListener = () => {
  const messaging = configuredMessaging();
  if (!messaging) return () => {};
  const opened = onNotificationOpenedApp(messaging, () => {});
  const foreground = onMessage(messaging, async message => {
    Alert.alert(message.notification?.title || 'Notifikasi Baru', message.notification?.body || '');
  });
  const refreshed = onTokenRefresh(messaging, token => saveToken(token).catch(error => console.log('FCM token refresh failed:', error)));
  getInitialNotification(messaging).catch(error => console.log('Initial notification failed:', error));
  return () => { opened(); foreground(); refreshed(); };
};
