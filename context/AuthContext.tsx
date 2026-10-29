import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearPushToken, updateProfile } from '../lib/database';
import {
  signInWithGoogle as runGoogleSignIn,
  handleAuthRedirectUrl,
} from '../lib/googleAuth';
import type { UserRole } from '../types';
import { changeUserRole, signUpWithRole, type SignUpResult } from '../lib/authActions';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Sign in with email + password. Returns error message on failure. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Sign up with email + password + display name + phone. Returns error message on failure. */
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string | undefined,
    role: UserRole,
  ) => Promise<SignUpResult>;
  /** Sign out and clear session. */
  signOut: (options?: { localOnly?: boolean }) => Promise<void>;
  changeRole: (userId: string, role: UserRole) => Promise<boolean>;
  /** Send password reset email. Returns error message on failure. */
  resetPassword: (email: string) => Promise<string | null>;
  /** Sign in with Google via Supabase OAuth. Returns true on success, false on cancellation. */
  signInWithGoogle: () => Promise<boolean>;
  /** Instant demo sign in with mock profile — works without Supabase credentials. */
  signInAsDemo: (role?: UserRole) => Promise<void>;
  /** Whether the app is running with real Supabase credentials. */
  isSupabaseEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const isSupabaseEnabled = supabase !== null;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        console.error('[AuthContext] Failed to restore session:', error.message);
      }
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    }).catch(error => {
      console.error('[AuthContext] Failed to restore session:', error);
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (event === 'SIGNED_IN' && s?.user) {
        try {
          const cachedRole = await AsyncStorage.getItem('imbafind_user_role');
          const role = (cachedRole === 'landlord' || cachedRole === 'tenant') ? cachedRole : undefined;
          const meta = s.user.user_metadata || {};
          const fullName = meta.full_name || meta.name;
          const avatarUrl = meta.avatar_url || meta.picture;

          if (fullName || avatarUrl || role) {
            await updateProfile(s.user.id, {
              fullName: fullName || undefined,
              avatarUrl: avatarUrl || undefined,
              role,
            });
          }
        } catch (err) {
          console.warn('[AuthContext] Background profile sync failed:', err);
        }
      }
    });

    // Listen for incoming deep link redirects (e.g. imbafind://... or exp://...)
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthRedirectUrl(url);
    });

    void Linking.getInitialURL().then(initialUrl => {
      if (initialUrl && active) {
        void handleAuthRedirectUrl(initialUrl);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!supabase) {
      // Mock mode — always succeed
      return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string | undefined,
      role: UserRole,
    ): Promise<SignUpResult> => {
      if (!supabase) {
        // No backend — return a clear error so the UI doesn't silently pretend to succeed
        return {
          error: 'Account creation requires a backend connection. Use "Try Demo" to explore the app.',
          requiresEmailConfirmation: false,
        };
      }
      return signUpWithRole(supabase, email, password, fullName, phone, role);
    },
    [],
  );

  const signOut = useCallback(async (options?: { localOnly?: boolean }) => {
    if (!supabase) {
      // Demo mode sign-out — just clear local state
      setUser(null);
      setSession(null);
      try {
        await AsyncStorage.multiRemove([
          'imbafind_user_role',
          '@imbafind_cached_properties',
          '@imbafind_cached_properties_time',
        ]);
      } catch {
        // ignore storage errors on demo signout
      }
      return;
    }
    if (user && !options?.localOnly) {
      try {
        await clearPushToken(user.id);
      } catch (tokenError) {
        console.error('[AuthContext] Failed to clear push token before sign out:', tokenError);
        Alert.alert('Could not sign out', 'Your notification token could not be cleared. Please try again.');
        return;
      }
    }
    const { error } = await supabase.auth.signOut(
      options?.localOnly ? { scope: 'local' } : undefined,
    );
    if (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      return;
    }
    try {
      await AsyncStorage.multiRemove([
        'imbafind_user_role',
        '@imbafind_cached_properties',
        '@imbafind_cached_properties_time',
      ]);
    } catch (storageError) {
      console.error('[AuthContext] Failed to clear cached account data:', storageError);
      Alert.alert('Signed out', 'Your local account cache could not be cleared. Please try again.');
    }
  }, [user]);

  const changeRole = useCallback(async (userId: string, role: UserRole): Promise<boolean> => {
    return changeUserRole(userId, role, updateProfile);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return null;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'imbafind://reset-password',
    });
    if (error) return error.message;
    return null;
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    const res = await runGoogleSignIn();
    return Boolean(res.success);
  }, []);

  const signInAsDemo = useCallback(async (role: UserRole = 'tenant') => {
    const demoUser: User = {
      id: role === 'landlord' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
      email: role === 'landlord' ? 'landlord@imbafind.co.zw' : 'tenant@imbafind.co.zw',
      app_metadata: { provider: 'demo' },
      user_metadata: {
        full_name: role === 'landlord' ? 'Tendai Makoni' : 'Farai Moyo',
        role,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    const demoSession = {
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: demoUser,
    } as Session;

    setUser(demoUser);
    setSession(demoSession);
    await AsyncStorage.setItem('imbafind_user_role', role);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        changeRole,
        resetPassword,
        signInWithGoogle,
        signInAsDemo,
        isSupabaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
