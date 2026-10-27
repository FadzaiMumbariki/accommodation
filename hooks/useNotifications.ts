import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { savePushToken } from '../lib/database';
import { getNotifications } from '../lib/notifications';

export async function requestAndSavePushToken(
  userId: string,
  requestPermission: boolean,
): Promise<string | null> {
  const notifications = getNotifications();
  if (!notifications) return null;

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync?.('default', {
      name: 'Default',
      importance: notifications.AndroidImportance?.DEFAULT,
    });
  }

  const current = await notifications.getPermissionsAsync?.();
  let permissionStatus = current?.status;
  if (permissionStatus !== 'granted' && requestPermission) {
    const requested = await notifications.requestPermissionsAsync?.();
    permissionStatus = requested?.status;
  }
  if (permissionStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is missing from the app configuration.');

  const tokenResult = await notifications.getExpoPushTokenAsync?.({ projectId });
  const token = tokenResult?.data;
  if (!token) throw new Error('Could not retrieve an Expo push token.');
  await savePushToken(userId, token);
  return token;
}

export function useNotifications() {
  const { user, isSupabaseEnabled } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const notifications = getNotifications();
    if (!notifications) return;

    notifications.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowList: true,
      }),
    });

    const responseSubscription = notifications.addNotificationResponseReceivedListener?.(response => {
      const data = response.notification.request.content.data;
      if (!data) return;
      if (typeof data.conversationId === 'string') {
        router.push({ pathname: '/chat', params: { conversationId: data.conversationId } });
      } else if (typeof data.viewingId === 'string') {
        router.push({ pathname: '/my-activity', params: { viewingId: data.viewingId } });
      }
    });

    const initialResponse = notifications.getLastNotificationResponse?.();
    const initialData = initialResponse?.notification.request.content.data;
    if (typeof initialData?.conversationId === 'string') {
      router.push({ pathname: '/chat', params: { conversationId: initialData.conversationId } });
    } else if (typeof initialData?.viewingId === 'string') {
      router.push({ pathname: '/my-activity', params: { viewingId: initialData.viewingId } });
    }

    return () => responseSubscription?.remove();
  }, [user, isSupabaseEnabled]);

  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) => {
    await getNotifications()?.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  }, []);

  return { sendLocalNotification };
}
