import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { parseDeepLink, executeDeepLink } from './deepLinking';
import { router } from 'expo-router';
import { Alert } from 'react-native';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('./googleAuth', () => ({
  isGoogleAuthCallbackUrl: jest.fn(
    (url: string) => url.includes('google-auth') || url.includes('auth/callback'),
  ),
  handleAuthRedirectUrl: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

describe('deepLinking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('parseDeepLink', () => {
    it('returns invalid for empty or non-string inputs', () => {
      expect(parseDeepLink('')).toEqual({ type: 'invalid', error: 'Empty or non-string URL' });
      expect(parseDeepLink(null)).toEqual({ type: 'invalid', error: 'Empty or non-string URL' });
      expect(parseDeepLink('   ')).toEqual({ type: 'invalid', error: 'Empty URL' });
    });

    it('identifies Google OAuth callback URLs', () => {
      const url = 'imbafind://google-auth?code=123';
      expect(parseDeepLink(url)).toEqual({ type: 'auth_callback', url });
    });

    it('parses property links with path format', () => {
      expect(parseDeepLink('https://imbafind.co.zw/property/p101')).toEqual({
        type: 'property',
        id: 'p101',
      });
      expect(parseDeepLink('imbafind://property/p202')).toEqual({
        type: 'property',
        id: 'p202',
      });
    });

    it('parses property links with query parameter format', () => {
      expect(parseDeepLink('imbafind://property-details?id=p303')).toEqual({
        type: 'property',
        id: 'p303',
      });
    });

    it('parses viewing links', () => {
      expect(parseDeepLink('https://imbafind.co.zw/viewing/v55')).toEqual({
        type: 'viewing',
        id: 'v55',
      });
    });

    it('parses chat and messages links', () => {
      expect(parseDeepLink('imbafind://chat?conversationId=c99')).toEqual({
        type: 'chat',
        conversationId: 'c99',
      });
      expect(parseDeepLink('imbafind://messages')).toEqual({
        type: 'chat',
        conversationId: undefined,
      });
    });

    it('parses common routes', () => {
      expect(parseDeepLink('imbafind://explore')).toEqual({
        type: 'route',
        path: '/(tabs)/explore',
      });
      expect(parseDeepLink('imbafind://saved')).toEqual({
        type: 'route',
        path: '/(tabs)/saved',
      });
    });

    it('flags unrecognized URLs', () => {
      expect(parseDeepLink('imbafind://some-random-unknown-page')).toEqual({
        type: 'unrecognized',
        rawUrl: 'imbafind://some-random-unknown-page',
      });
    });
  });

  describe('executeDeepLink', () => {
    it('routes valid property deep links to property details', async () => {
      const handled = await executeDeepLink('https://imbafind.co.zw/property/p123');
      expect(handled).toBe(true);
      expect(router.push).toHaveBeenCalledWith('/property-details?id=p123');
    });

    it('falls back gracefully on unrecognized links and navigates to explore', async () => {
      const onFallback = jest.fn();
      const handled = await executeDeepLink('imbafind://bogus-page', { onFallback });

      expect(handled).toBe(false);
      expect(onFallback).toHaveBeenCalledWith(
        'The link you opened is invalid or no longer available.',
      );
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/explore');
    });

    it('shows Alert when showAlertOnFallback is enabled', async () => {
      const handled = await executeDeepLink('imbafind://invalid-route', {
        showAlertOnFallback: true,
      });

      expect(handled).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Link Notice',
        'The link you opened is invalid or no longer available.',
      );
    });
  });
});
