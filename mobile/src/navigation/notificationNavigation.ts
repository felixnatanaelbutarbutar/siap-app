import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';

export const notificationNavigation = createNavigationContainerRef<any>();
let pendingReport = false;
export function openScheduledReport() {
  pendingReport = true;
  flushReportNavigation();
}
export function flushReportNavigation() {
  if (!pendingReport || !notificationNavigation.isReady() || !useAuthStore.getState().token) return;
  if (!notificationNavigation.getRootState()?.routeNames.includes('Main')) return;
  pendingReport = false;
  notificationNavigation.navigate('Main', { screen: 'Terjadwal' });
}
