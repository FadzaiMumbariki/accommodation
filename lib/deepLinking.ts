import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { RouteHelpers, Routes } from '../constants/routes';
import { isGoogleAuthCallbackUrl, handleAuthRedirectUrl } from './googleAuth';

export type DeepLinkResult =
  | { type: 'auth_callback'; url: string }
  | { type: 'property'; id: string }
  | { type: 'viewing'; id: string }
  | { type: 'chat'; conversationId?: string }
  | { type: 'route'; path: string }
  | { type: 'unrecognized'; rawUrl: string }
  | { type: 'invalid'; error: string };

/**
 * Extracts normalized path and query parameters reliably across all platforms and test environments.
 */
function extractPathAndParams(rawUrl: string): {
  path: string;
  queryParams: Record<string, string>;
} {
  // 1. Separate query parameters
  const [urlWithoutQuery, queryPart] = rawUrl.split('?');
  const queryParams: Record<string, string> = {};

  if (queryPart) {
    const pairs = queryPart.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        queryParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }
  }

  // 2. Remove scheme (e.g. "https://", "imbafind://")
  let remainder = urlWithoutQuery.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');

  // 3. If there is a domain name like "imbafind.co.zw", remove it
  if (remainder.startsWith('imbafind.co.zw/') || remainder === 'imbafind.co.zw') {
    remainder = remainder.replace(/^imbafind\.co\.zw\/?/, '');
  } else if (remainder.startsWith('www.imbafind.co.zw/') || remainder === 'www.imbafind.co.zw') {
    remainder = remainder.replace(/^www\.imbafind\.co\.zw\/?/, '');
  }

  // 4. Normalize path
  const path = remainder.replace(/^\/+|\/+$/g, '');
  return { path, queryParams };
}

/**
 * Safely parses any deep link or Universal/App link URL into a structured destination.
 */
export function parseDeepLink(rawUrl: string | null | undefined): DeepLinkResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { type: 'invalid', error: 'Empty or non-string URL' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { type: 'invalid', error: 'Empty URL' };
  }

  // 1. Google OAuth callback verification
  if (isGoogleAuthCallbackUrl(trimmed)) {
    return { type: 'auth_callback', url: trimmed };
  }

  try {
    const { path, queryParams } = extractPathAndParams(trimmed);

    // 2. Property details links:
    // e.g. /property/p1, /property-details?id=p1, imbafind://property/p1
    if (path.startsWith('property/') || path === 'property') {
      const parts = path.split('/');
      const id = parts[1] || (queryParams.id as string);
      if (id) {
        return { type: 'property', id };
      }
    }
    if (path === 'property-details' && queryParams.id) {
      return { type: 'property', id: String(queryParams.id) };
    }

    // 3. Viewing links:
    // e.g. /viewing/v1, /book-viewing?propertyId=p1
    if (path.startsWith('viewing/') || path === 'viewing') {
      const parts = path.split('/');
      const id = parts[1] || (queryParams.id as string) || (queryParams.viewingId as string);
      if (id) {
        return { type: 'viewing', id };
      }
    }
    if (path === 'book-viewing' && queryParams.propertyId) {
      return { type: 'route', path: `${Routes.bookViewing}?propertyId=${queryParams.propertyId}` };
    }

    // 4. Chat & message links:
    if (path.startsWith('chat') || path === 'messages') {
      const conversationId = queryParams.conversationId
        ? String(queryParams.conversationId)
        : undefined;
      return { type: 'chat', conversationId };
    }

    // 5. Standard tab routes:
    if (path === 'explore' || path === 'home') {
      return { type: 'route', path: Routes.explore };
    }
    if (path === 'saved') {
      return { type: 'route', path: Routes.saved };
    }
    if (path === 'profile') {
      return { type: 'route', path: Routes.profile };
    }
    if (path === 'login' || path === 'signup') {
      return { type: 'route', path: `/${path}` };
    }

    // Fallback for valid scheme or domain but unknown route
    if (trimmed.startsWith('imbafind://') || trimmed.includes('imbafind.co.zw')) {
      return { type: 'unrecognized', rawUrl: trimmed };
    }

    return { type: 'unrecognized', rawUrl: trimmed };
  } catch (err) {
    return {
      type: 'invalid',
      error: err instanceof Error ? err.message : 'Failed to parse URL',
    };
  }
}

/**
 * Handles incoming deep link with fallback routing and user-friendly error alerts.
 * Returns true if handled successfully, false if fell back or errored.
 */
export async function executeDeepLink(
  rawUrl: string,
  options?: {
    showAlertOnFallback?: boolean;
    onFallback?: (reason: string) => void;
  },
): Promise<boolean> {
  const result = parseDeepLink(rawUrl);

  switch (result.type) {
    case 'auth_callback':
      try {
        await handleAuthRedirectUrl(result.url);
        return true;
      } catch (authErr) {
        console.error('[DeepLink] OAuth callback error:', authErr);
        if (options?.showAlertOnFallback) {
          Alert.alert(
            'Sign In Error',
            'Unable to complete Google authentication. Please try again.',
          );
        }
        return false;
      }

    case 'property':
      try {
        router.push(RouteHelpers.propertyDetails(result.id) as never);
        return true;
      } catch (navErr) {
        console.error('[DeepLink] Failed navigating to property:', navErr);
        handleFallback('Could not open the requested property listing.', options);
        return false;
      }

    case 'viewing':
      try {
        router.push(Routes.myActivity as never);
        return true;
      } catch (navErr) {
        console.error('[DeepLink] Failed navigating to viewing:', navErr);
        handleFallback('Could not open the requested viewing.', options);
        return false;
      }

    case 'chat':
      try {
        if (result.conversationId) {
          router.push(`${Routes.chat}?id=${encodeURIComponent(result.conversationId)}` as never);
        } else {
          router.push(Routes.messages as never);
        }
        return true;
      } catch (navErr) {
        console.error('[DeepLink] Failed navigating to chat:', navErr);
        handleFallback('Could not open chat.', options);
        return false;
      }

    case 'route':
      try {
        router.push(result.path as never);
        return true;
      } catch (navErr) {
        console.error('[DeepLink] Failed navigating to route:', navErr);
        handleFallback('Page could not be loaded.', options);
        return false;
      }

    case 'unrecognized':
    case 'invalid':
    default:
      console.warn('[DeepLink] Unrecognized or invalid deep link:', rawUrl);
      handleFallback('The link you opened is invalid or no longer available.', options);
      return false;
  }
}

function handleFallback(
  message: string,
  options?: {
    showAlertOnFallback?: boolean;
    onFallback?: (reason: string) => void;
  },
) {
  if (options?.onFallback) {
    options.onFallback(message);
  } else if (options?.showAlertOnFallback) {
    Alert.alert('Link Notice', message);
  }

  // Gracefully redirect to explore tab if user is stranded
  try {
    router.replace(Routes.explore as never);
  } catch {
    // Already on a safe screen or routing unavailable
  }
}
