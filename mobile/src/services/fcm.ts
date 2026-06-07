import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';
import { api } from './api';

export const requestUserPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      getFCMToken();
    }
  } catch (error) {
    console.warn('FCM Permission Error (mungkin google-services.json belum ada):', error);
  }
};

const getFCMToken = async () => {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      console.log('FCM Token:', fcmToken);
      // Kirim token ke backend
      await api.post('/auth/fcm-token', { fcm_token: fcmToken });
    }
  } catch (error) {
    console.log('Gagal mendapatkan FCM token', error);
  }
};

export const NotificationListener = () => {
  try {
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notifikasi di-tap dari background:', remoteMessage.notification);
      // Navigasi ke layar spesifik (bisa via NavigationRef)
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Aplikasi dibuka dari state KILLED via notifikasi:', remoteMessage.notification);
        }
      });

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      // Tampilkan Alert In-App (karena aplikasi sedang aktif/foreground)
      Alert.alert(
        remoteMessage.notification?.title || 'Notifikasi Baru',
        remoteMessage.notification?.body || ''
      );
    });

    return unsubscribe;
  } catch (error) {
    console.warn('FCM Listener Error:', error);
    return () => {}; // Dummy unsubscribe function
  }
};
