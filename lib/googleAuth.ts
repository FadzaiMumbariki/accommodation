import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export type OAuthProvider = 'google';

/**
 * Extracts authentication parameters from the OAuth return URL.
 * Checks both query parameters (?code=... or ?error=...) and hash fragments (#access_token=... or #error=...),
 * safely handling custom protocols (exp://, imbafind://, http://) across Expo Go and standalone builds.
 */
export function extractAuthParams(url: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
} {
  let code: string | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let error: string | null = null;

  try {
    // 1. Check query parameters (?code=... or &code=...)
    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const qString = url.slice(qIndex + 1).split('#')[0];
      const qParams = new URLSearchParams(qString);
      code = qParams.get('code');
      accessToken = qParams.get('access_token');
      refreshToken = qParams.get('refresh_token');
      error = qParams.get('error_description') || qParams.get('error');
    }

    // 2. Check hash fragments (#access_token=... or &access_token=...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const fragmentString = url.slice(hashIndex + 1);
      const fragmentParams = new URLSearchParams(fragmentString);
      if (!code) code = fragmentParams.get('code');
      if (!accessToken) accessToken = fragmentParams.get('access_token');
      if (!refreshToken) refreshToken = fragmentParams.get('refresh_token');
      if (!error) {
        error = fragmentParams.get('error_description') || fragmentParams.get('error');
      }
    }
  } catch {
    // Graceful fallback if URL is malformed
  }

  return { code, accessToken, refreshToken, error };
}

/**
 * Completes the OAuth session using the code or tokens returned in the redirect URL.
 */
// The same redirect can reach both the deep-link listener and openAuthSessionAsync.
// A PKCE code can only be exchanged once, so concurrent callers share one exchange.
const codeExchanges = new Map<string, Promise<boolean>>();

function exchangeCodeOnce(code: string): Promise<boolean> {
  const existing = codeExchanges.get(code);
  if (existing) return existing;
  const exchange = (async () => {
    const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return true;
  })();
  codeExchanges.set(code, exchange);
  // Forget failed attempts so a fresh retry is possible.
  exchange.catch(() => codeExchanges.delete(code));
  return exchange;
}

export async function completeFromRedirectUrl(url: string): Promise<boolean> {
  const { code, accessToken, refreshToken, error } = extractAuthParams(url);

  if (code) {
    return exchangeCodeOnce(code);
  }

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase!.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
    return true;
  }

  if (error) {
    throw new Error(decodeURIComponent(error.replace(/\+/g, ' ')));
  }

  return false;
}

/**
 * Global deep-link handler for OAuth redirect URLs.
 * Safely parses the URL and exchanges authorization code/tokens for a persistent session.
 */
export async function handleAuthRedirectUrl(url: string): Promise<boolean> {
  if (!url || (!url.includes('code=') && !url.includes('access_token=') && !url.includes('error='))) {
    return false;
  }
  try {
    return await completeFromRedirectUrl(url);
  } catch (err) {
    console.warn('[googleAuth] Failed to process auth redirect URL:', err);
    return false;
  }
}

/**
 * Signs the user in with Google via Supabase OAuth. On web it redirects the page; on native it
 * opens an in-app browser session and exchanges the returned authorization code/tokens for a session.
 */
export async function signInWithGoogle(): Promise<{ success: boolean; cancelled?: boolean }> {
  if (!supabase) throw new Error('Sign-in is not configured for this build.');

  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in.');

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return { success: false, cancelled: false };
  }

  try {
    await WebBrowser.warmUpAsync();
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, cancelled: true };
    }

    if ('url' in result && result.url) {
      const completed = await completeFromRedirectUrl(result.url);
      return { success: completed };
    }

    return { success: false };
  } finally {
    void WebBrowser.coolDownAsync();
  }
}
