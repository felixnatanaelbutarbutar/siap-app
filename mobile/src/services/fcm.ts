import notifee, {AndroidImportance,EventType} from '@notifee/react-native';
import {openScheduledReport} from '../navigation/notificationNavigation';
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
    await notifee.createChannel({id:'siap-reports',name:'Laporan terjadwal',importance:AndroidImportance.HIGH,sound:'default'});
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
  const notifeeOpened=notifee.onForegroundEvent(({type,detail})=>{if(type===EventType.PRESS && detail.notification?.data?.type==='reminder_laporan_perjam')openScheduledReport();});
  notifee.getInitialNotification().then(initial=>{if(initial?.notification?.data?.type==='reminder_laporan_perjam')openScheduledReport();}).catch(()=>{});
  const opened = onNotificationOpenedApp(messaging, message => {if(message.data?.type==='reminder_laporan_perjam')openScheduledReport();});
  const foreground = onMessage(messaging, async message => {
    if(__DEV__) console.log("[FCM] Received:",message.data?.type||"notification");
    Alert.alert(message.notification?.title || 'Notifikasi Baru', message.notification?.body || '', message.data?.type==='reminder_laporan_perjam'?[{text:'Nanti',style:'cancel'},{text:'Buka jadwal',onPress:openScheduledReport}]:undefined);
  });
  const refreshed = onTokenRefresh(messaging, token => saveToken(token).catch(error => console.log('FCM token refresh failed:', error)));
  getInitialNotification(messaging).then(message=>{if(message?.data?.type==='reminder_laporan_perjam')openScheduledReport();}).catch(error => console.log('Initial notification failed:', error));
  return () => { opened(); foreground(); refreshed(); notifeeOpened(); };
};
