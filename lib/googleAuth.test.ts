import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  extractAuthParams,
  completeFromRedirectUrl,
  handleAuthRedirectUrl,
  isGoogleAuthCallbackUrl,
} from './googleAuth';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

describe('googleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractAuthParams', () => {
    it('extracts PKCE code from query parameter', () => {
      const url = 'imbafind://?code=mock-auth-code-123';
      const params = extractAuthParams(url);
      expect(params.code).toBe('mock-auth-code-123');
      expect(params.error).toBeNull();
    });

    it('extracts tokens from hash fragment', () => {
      const url = 'http://localhost:8083/#access_token=mock-at&refresh_token=mock-rt&token_type=bearer';
      const params = extractAuthParams(url);
      expect(params.accessToken).toBe('mock-at');
      expect(params.refreshToken).toBe('mock-rt');
      expect(params.code).toBeNull();
      expect(params.error).toBeNull();
    });

    it('extracts error descriptions from query parameter or hash fragment', () => {
      const urlWithQueryErr = 'imbafind://?error=access_denied&error_description=User+cancelled';
      const params = extractAuthParams(urlWithQueryErr);
      expect(params.error).toBe('User cancelled');

      const urlWithHashErr = 'imbafind://#error=server_error&error_description=Database+offline';
      const hashParams = extractAuthParams(urlWithHashErr);
      expect(hashParams.error).toBe('Database offline');
    });
  });

  describe('completeFromRedirectUrl', () => {
    it('exchanges code for session when code is present', async () => {
      (supabase!.auth.exchangeCodeForSession as any).mockResolvedValueOnce({
        data: { session: {} as any, user: {} as any },
        error: null,
      });

      const success = await completeFromRedirectUrl('imbafind://?code=pkce-code-456');
      expect(success).toBe(true);
      expect(supabase!.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code-456');
    });

    it('sets session when tokens are present in hash', async () => {
      (supabase!.auth.setSession as any).mockResolvedValueOnce({
        data: { session: {} as any, user: {} as any },
        error: null,
      });

      const success = await completeFromRedirectUrl('http://localhost:8083/#access_token=jwt-at&refresh_token=jwt-rt');
      expect(success).toBe(true);
      expect(supabase!.auth.setSession).toHaveBeenCalledWith({
        access_token: 'jwt-at',
        refresh_token: 'jwt-rt',
      });
    });

    it('exchanges a code only once when the listener and auth session both receive it', async () => {
      (supabase!.auth.exchangeCodeForSession as any).mockResolvedValueOnce({
        data: { session: {} as any, user: {} as any },
        error: null,
      });

      const url = 'imbafind://?code=shared-code-789';
      const [fromListener, fromSession] = await Promise.all([
        handleAuthRedirectUrl(url),
        completeFromRedirectUrl(url),
      ]);
      expect(fromListener).toBe(true);
      expect(fromSession).toBe(true);
      expect(supabase!.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    });

    it('throws decoded error when error param is returned', async () => {
      await expect(
        completeFromRedirectUrl('imbafind://?error=access_denied&error_description=User+denied+consent')
      ).rejects.toThrow('User denied consent');
    });
  });

  describe('handleAuthRedirectUrl', () => {
    it('ignores non-auth URLs safely without errors', async () => {
      const handled = await handleAuthRedirectUrl('imbafind://tabs/explore');
      expect(handled).toBe(false);
      expect(supabase!.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('processes valid auth redirect URLs', async () => {
      (supabase!.auth.exchangeCodeForSession as any).mockResolvedValueOnce({
        data: { session: {} as any, user: {} as any },
        error: null,
      });

      const handled = await handleAuthRedirectUrl('imbafind://auth/callback?code=valid-code');
      expect(handled).toBe(true);
      expect(supabase!.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
    });
  });

  describe('isGoogleAuthCallbackUrl', () => {
    it('returns true for native auth callback URLs with code or tokens', () => {
      expect(isGoogleAuthCallbackUrl('imbafind://auth/callback?code=mock-code')).toBe(true);
      expect(isGoogleAuthCallbackUrl('exp://127.0.0.1:8081/--/auth/callback#access_token=token&refresh_token=rt')).toBe(true);
    });

    it('returns true for web auth callback URLs with error', () => {
      expect(isGoogleAuthCallbackUrl('https://imbafind.co.zw/auth/callback?error=access_denied')).toBe(true);
    });

    it('returns false for password reset URLs so they are not hijacked', () => {
      expect(isGoogleAuthCallbackUrl('imbafind://reset-password?code=reset-code-123')).toBe(false);
      expect(isGoogleAuthCallbackUrl('https://imbafind.co.zw/reset-password#access_token=reset-token')).toBe(false);
    });

    it('returns false for unrelated URLs and non-auth callback URLs', () => {
      expect(isGoogleAuthCallbackUrl('imbafind://tabs/explore')).toBe(false);
      expect(isGoogleAuthCallbackUrl('')).toBe(false);
    });
  });
});
