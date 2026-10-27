import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl: string =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const supabaseAnonKey: string =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isServer = typeof window === 'undefined';

const memoryStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

const realtimeTransport =
  typeof WebSocket === 'undefined' && typeof window === 'undefined'
    ? (() => {
        try {
          return require('ws');
        } catch {
          return undefined;
        }
      })()
    : undefined;

/**
 * Supabase client with session persistence via AsyncStorage on native/client,
 * and memoryStorage fallback for server/SSR environments.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: isServer ? memoryStorage : AsyncStorage,
          autoRefreshToken: !isServer,
          persistSession: !isServer,
          detectSessionInUrl: false,
        },
        realtime: realtimeTransport ? { transport: realtimeTransport } : undefined,
      })
    : null;
