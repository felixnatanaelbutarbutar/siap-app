import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/auth.store';

// Screens
import { BerandaScreen } from '../screens/main/BerandaScreen';
import { AbsensiScreen } from '../screens/main/AbsensiScreen';
import { ProfilScreen } from '../screens/profil/ProfilScreen';
import { ListLaporanScreen } from '../screens/laporan/ListLaporanScreen';
import { BuatLaporanScreen } from '../screens/laporan/BuatLaporanScreen';
import { DetailLaporanScreen } from '../screens/laporan/DetailLaporanScreen';
import { LaporanPerJamScreen } from '../screens/laporan/LaporanPerJamScreen';
import { SerahTerimaScreen } from '../screens/serahterima/SerahTerimaScreen';
import { KonfirmasiSerahTerimaScreen } from '../screens/serahterima/KonfirmasiSerahTerimaScreen';
import { IzinCutiScreen } from '../screens/main/IzinCutiScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Laporan Stack untuk tab Laporan
const LaporanStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListLaporan" component={ListLaporanScreen} />
      <Stack.Screen name="BuatLaporan" component={BuatLaporanScreen} />
      <Stack.Screen name="DetailLaporan" component={DetailLaporanScreen} />
    </Stack.Navigator>
  );
};

// Bottom Tabs Wrapper
const MainTabs = () => {
  const user = useAuthStore((state) => state.user);
  
  if (!user) return null;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#006e2f',
        tabBarInactiveTintColor: '#6d7b6c',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e8f0e4',
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerStyle: { backgroundColor: '#006e2f' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tab.Screen 
        name="Beranda" 
        component={BerandaScreen} 
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />
        }}
      />
      
      <Tab.Screen 
        name="Absensi" 
        component={AbsensiScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="map-marker-check" color={color} size={size} />
        }}
      />

      <Tab.Screen 
        name="Laporan" 
        component={LaporanStack} 
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="file-document-edit" color={color} size={size} />
        }}
      />

      {user.role === 'SATPAM' && (
        <Tab.Screen 
          name="Per 3 Jam" 
          component={LaporanPerJamScreen} 
          options={{
            title: 'Per 3 Jam',
            tabBarIcon: ({ color, size }) => <Icon name="clock-check" color={color} size={size} />
          }}
        />
      )}

      <Tab.Screen 
        name="Profil" 
        component={ProfilScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
};

// App Navigator (menyatukan MainTabs dengan Modals)
export const AppNavigator = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main Bottom Tabs */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Modals (Hanya SATPAM & UTILITY yang bisa akses fitur Serah Terima) */}
      {(user?.role === 'SATPAM' || user?.role === 'UTILITY') && (
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen 
            name="SerahTerimaModal" 
            component={SerahTerimaScreen} 
            options={{ headerShown: true, title: 'Mulai Serah Terima' }}
          />
          <Stack.Screen 
            name="KonfirmasiSerahTerimaModal" 
            component={KonfirmasiSerahTerimaScreen} 
            options={{ headerShown: true, title: 'Konfirmasi Serah Terima' }}
          />
        </Stack.Group>
      )}

      {/* Global Screens */}
      <Stack.Screen 
        name="IzinCuti" 
        component={IzinCutiScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
