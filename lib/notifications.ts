import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type NotificationsModule = typeof import('expo-notifications');

export function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;

  try {
    // Guarded require: expo-notifications is unavailable in Expo Go, so a
    // static import would throw at module load. Lazy require + try/catch is deliberate.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('[notifications] Notifications module is unavailable:', error);
    return null;
  }
}
