import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export type OAuthProvider = 'google';

/**
 * Extracts the PKCE `code` that Supabase appends to the redirect URL and exchanges it for a
 * session. Supabase may return the code either as a query param (`?code=…`) or in the URL
 * fragment (`#code=…`), so both are checked. On native the auth result comes back through the
 * in-app browser's return URL.
 */
async function completeFromRedirectUrl(url: string): Promise<void> {
  // Normalise the custom scheme to a parseable http origin, preserving the query/fragment.
  const normalised = url.replace(/^imbafind:\/\/[^?#]*/i, 'https://placeholder.local');
  const parsed = new URL(normalised);
  const query = new URLSearchParams(parsed.search.replace(/^\?/, ''));
  const fragment = new URLSearchParams(parsed.hash.replace(/^[#?]/, ''));
  const getParam = (key: string): string | null => query.get(key) ?? fragment.get(key);

  const code = getParam('code');
  if (code) {
    const { error } = await supabase!.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const reason = getParam('error_description') || getParam('error');
  if (reason) throw new Error(reason);
  throw new Error('Google sign-in did not complete. Please try again.');
}

/**
 * Signs the user in with Google via Supabase OAuth. On web it redirects the page; on native it
 * opens the system browser and exchanges the returned authorization code for a session.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Sign-in is not configured for this build.');

  const redirectTo =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in.');

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return;
  }

  await WebBrowser.warmUpAsync();
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Google sign-in was cancelled.');
    }
    if ('url' in result && result.url) {
      await completeFromRedirectUrl(result.url);
    }
  } finally {
    void WebBrowser.coolDownAsync();
  }
}
