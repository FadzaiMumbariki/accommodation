import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional dependency; top-level import would break bundling when 'ws' is absent
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
          // On web, Supabase completes OAuth redirects by reading the code from the URL.
          detectSessionInUrl: typeof window !== 'undefined',
          // PKCE is required for the OAuth (Continue with Google) flow.
          flowType: 'pkce',
        },
        realtime: realtimeTransport ? { transport: realtimeTransport } : undefined,
      })
    : null;
