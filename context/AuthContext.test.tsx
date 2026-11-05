import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { Alert } from 'react-native';

import { clearPushToken, updateProfile } from '../lib/database';
import { signInWithGoogle as runGoogleSignIn } from '../lib/googleAuth';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../lib/supabase', () => ({
  get supabase() {
    const state = (globalThis as Record<string, unknown>).__authMock as
      { client: unknown } | undefined;
    return state?.client ?? null;
  },
}));

jest.mock('../lib/database', () => ({
  clearPushToken: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../lib/googleAuth', () => ({
  signInWithGoogle: jest.fn(),
  handleAuthRedirectUrl: jest.fn(),
  isGoogleAuthCallbackUrl: jest.fn(() => false),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `imbafind://${path}`),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

const authStub: Record<string, any> = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
};

const mockState: { client: unknown } = { client: null };
(globalThis as Record<string, unknown>).__authMock = mockState;

const clearPushTokenMock = clearPushToken as any;
const updateProfileMock = updateProfile as any;
const googleSignInMock = runGoogleSignIn as any;

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: Wrapper });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.client = { auth: authStub };
    authStub.getSession.mockResolvedValue({ data: { session: null }, error: null });
    authStub.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    authStub.signInWithPassword.mockResolvedValue({ error: null });
    authStub.signUp.mockResolvedValue({ data: { session: null }, error: null });
    authStub.signOut.mockResolvedValue({ error: null });
    authStub.resetPasswordForEmail.mockResolvedValue({ error: null });
    clearPushTokenMock.mockResolvedValue(undefined);
    updateProfileMock.mockResolvedValue(true);
    googleSignInMock.mockResolvedValue({ success: true });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('throws when useAuth is called outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within AuthProvider',
    );

    consoleError.mockRestore();
  });

  it('restores an existing session on mount and stops loading', async () => {
    authStub.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });

    const { result } = await renderAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: 'user-1' });
    expect(result.current.isSupabaseEnabled).toBe(true);
  });

  it('logs and still stops loading when session restore fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    authStub.getSession.mockRejectedValue(new Error('boom'));

    const { result } = await renderAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('is disabled when there are no Supabase credentials', async () => {
    mockState.client = null;

    const { result } = await renderAuth();

    expect(result.current.isSupabaseEnabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('signs in with email and password', async () => {
    const { result } = await renderAuth();

    let outcome: string | null = 'unset';
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'secret');
    });

    expect(outcome).toBeNull();
    expect(authStub.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    });
  });

  it('surfaces the Supabase sign-in error message', async () => {
    authStub.signInWithPassword.mockResolvedValue({ error: { message: '  Invalid login  ' } });

    const { result } = await renderAuth();

    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'wrong');
    });

    expect(outcome).toBe('Invalid login');
  });

  it('refuses to sign in without a backend', async () => {
    mockState.client = null;
    const { result } = await renderAuth();

    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.signIn('a@b.com', 'secret');
    });

    expect(outcome).toContain('Add your Supabase credentials');
  });

  it('signs up and reports that email confirmation is required', async () => {
    const { result } = await renderAuth();

    let res: Awaited<ReturnType<typeof result.current.signUp>>;
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'secret', 'Tariro M', undefined, 'tenant');
    });

    expect(res!).toEqual({ error: null, requiresEmailConfirmation: true });
    expect(authStub.signUp).toHaveBeenCalled();
  });

  it('returns a clear error when signing up without a backend', async () => {
    mockState.client = null;
    const { result } = await renderAuth();

    let res: Awaited<ReturnType<typeof result.current.signUp>>;
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'secret', 'Tariro M', '077', 'landlord');
    });

    expect(res!.error).toContain('requires a backend connection');
    expect(res!.requiresEmailConfirmation).toBe(false);
  });

  it('clears the push token before signing out', async () => {
    authStub.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(clearPushTokenMock).toHaveBeenCalledWith('user-1');
    expect(authStub.signOut).toHaveBeenCalled();
  });

  it('aborts sign-out when the push token cannot be cleared', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    authStub.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    clearPushTokenMock.mockRejectedValue(new Error('offline'));

    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(authStub.signOut).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Could not sign out',
      'Your notification token could not be cleared. Please try again.',
    );
    consoleError.mockRestore();
  });

  it('alerts when Supabase rejects the sign-out', async () => {
    authStub.signOut.mockResolvedValue({ error: { message: 'nope' } });
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.signOut();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to sign out. Please try again.');
  });

  it('clears local state on a demo-mode sign-out', async () => {
    mockState.client = null;
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('changes a user role through updateProfile', async () => {
    const { result } = await renderAuth();

    let changed = false;
    await act(async () => {
      changed = await result.current.changeRole('user-1', 'landlord');
    });

    expect(changed).toBe(true);
    expect(updateProfileMock).toHaveBeenCalledWith('user-1', { role: 'landlord' });
  });

  it('sends a password reset email', async () => {
    const { result } = await renderAuth();

    let outcome: string | null = 'unset';
    await act(async () => {
      outcome = await result.current.resetPassword('a@b.com');
    });

    expect(outcome).toBeNull();
    expect(authStub.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: 'imbafind:///reset-password',
    });
  });

  it('returns the error message when the reset email fails', async () => {
    authStub.resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limited' } });

    const { result } = await renderAuth();

    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.resetPassword('a@b.com');
    });

    expect(outcome).toBe('rate limited');
  });

  it('reports the Google sign-in result', async () => {
    const { result } = await renderAuth();

    let ok = false;
    await act(async () => {
      ok = await result.current.signInWithGoogle();
    });
    expect(ok).toBe(true);

    googleSignInMock.mockResolvedValue({ success: false });
    await act(async () => {
      ok = await result.current.signInWithGoogle();
    });
    expect(ok).toBe(false);
  });

  it('syncs the profile for a newly created account on sign-in', async () => {
    const { result } = await renderAuth();
    const changeHandler = authStub.onAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown,
    ) => void;

    const now = new Date();
    const session = {
      user: {
        id: 'new-user',
        created_at: now.toISOString(),
        last_sign_in_at: new Date(now.getTime() + 1000).toISOString(),
        user_metadata: { full_name: 'Tariro M' },
      },
    };

    await act(async () => {
      changeHandler('SIGNED_IN', session);
    });
    await flush();

    expect(updateProfileMock).toHaveBeenCalledWith(
      'new-user',
      expect.objectContaining({ fullName: 'Tariro M' }),
    );
    expect(result.current.user).toMatchObject({ id: 'new-user' });
  });
});
