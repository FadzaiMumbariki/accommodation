import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type NotificationsModule = typeof import('expo-notifications');

export function getNotifications(): NotificationsModule | null {
  if (isExpoGo || Platform.OS === 'web') return null;

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

export interface RemotePushParams {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

export async function sendRemotePushNotification(params: RemotePushParams): Promise<boolean> {
  try {
    if (!supabase) return false;
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: params,
    });
    if (error) {
      console.warn('[notifications] sendRemotePushNotification error:', error.message);
      return false;
    }
    return Boolean(data?.success);
  } catch (error) {
    console.warn('[notifications] Failed to invoke send-push:', error);
    return false;
  }
}
