# SIAP Mobile

Aplikasi mobile React Native 0.74 untuk satpam.

> **Setup lengkap akan dilakukan di TASK-10** (Setup Navigasi & Struktur Layar)

## Struktur yang akan dibuat di TASK-10:

```
src/
├── screens/
│   ├── auth/LoginScreen.tsx
│   ├── main/BerandaScreen.tsx
│   ├── main/AbsensiScreen.tsx
│   ├── laporan/ListLaporanScreen.tsx
│   ├── laporan/BuatLaporanScreen.tsx
│   ├── laporan/DetailLaporanScreen.tsx
│   ├── laporan/LaporanPerJamScreen.tsx
│   ├── serahterima/SerahTerimaScreen.tsx
│   ├── serahterima/KonfirmasiSerahTerimaScreen.tsx
│   └── profil/ProfilScreen.tsx
├── stores/authStore.ts
├── services/api.ts
└── navigation/
    ├── AuthStack.tsx
    └── AppStack.tsx
```

## Dependencies (akan diinstall di TASK-10):
- React Navigation v6
- Zustand
- React Native Paper
- react-native-vision-camera
- react-native-geolocation-service
- react-native-biometrics
- react-native-encrypted-storage
- op-sqlite + react-query
- Notifee + Firebase Messaging
- react-native-signature-canvas
