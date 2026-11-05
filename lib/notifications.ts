import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let runningInExpoGo = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isRunningInExpoGo } = require('expo');
  if (typeof isRunningInExpoGo === 'function') {
    runningInExpoGo = isRunningInExpoGo();
  }
} catch {
  // Ignore in environments where expo cannot be resolved
}

export const isExpoGo: boolean =
  runningInExpoGo ||
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants.executionEnvironment as string) === 'storeClient';

export type NotificationsModule = typeof import('expo-notifications');

function hasNativeNotificationsSupport(): boolean {
  if (isExpoGo || Platform.OS === 'web') return false;

  // In test environment, bypass native module resolution so unit mocks work
  if (process.env.NODE_ENV === 'test') return true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo');
    if (typeof requireOptionalNativeModule === 'function') {
      if (Platform.OS === 'android') {
        // TopicSubscriptionModule.android.js throws if ExpoTopicSubscriptionModule is missing
        return requireOptionalNativeModule('ExpoTopicSubscriptionModule') != null;
      }
      return (
        requireOptionalNativeModule('ExpoNotificationsEmitter') != null ||
        requireOptionalNativeModule('ExpoNotificationPermissionsModule') != null
      );
    }
  } catch {
    return false;
  }

  return true;
}

export function getNotifications(): NotificationsModule | null {
  if (!hasNativeNotificationsSupport()) return null;

  try {
    // Guarded require: expo-notifications requires native modules that may be absent in Expo Go
    // or unbuilt dev clients. Lazy require + try/catch is deliberate.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('[notifications] Notifications module is unavailable:', error);
    return null;
  }
}
