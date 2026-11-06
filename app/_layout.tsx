import React, { useEffect } from 'react';
import { Buffer } from 'buffer';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';

import { LogBox } from 'react-native';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { Brand } from '../constants/Colors';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { installErrorReporting } from '../lib/errorReporting';
import { useNotifications } from '../hooks/useNotifications';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { SENTRY_ENABLED, SENTRY_DSN, logEnvConfig } from '../constants/envConfig';
import { executeDeepLink } from '../lib/deepLinking';

WebBrowser.maybeCompleteAuthSession();

LogBox.ignoreLogs(["The action 'ROUTE_NAMES_CHANGED'"]);

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN });
  // Forward caught errors logged via console.error to Sentry.
  installErrorReporting();
}

// Log environment configuration in development
if (__DEV__) {
  logEnvConfig();
}

const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
globalWithBuffer.Buffer = globalWithBuffer.Buffer ?? Buffer;
if (typeof window !== 'undefined') {
  const windowWithBuffer = window as Window & { Buffer?: typeof Buffer };
  windowWithBuffer.Buffer = windowWithBuffer.Buffer ?? Buffer;
}

function AppShell() {
  // Registers for push notifications and sets up listeners app-wide
  useNotifications();

  // Deep link listener with fallback error handling
  useEffect(() => {
    const onReceiveURL = async (event: { url: string }) => {
      try {
        await executeDeepLink(event.url, { showAlertOnFallback: true });
      } catch (error) {
        console.error('[DeepLink] Listener error:', error);
      }
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);

    // Handle deep link if app was launched directly from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        executeDeepLink(url, { showAlertOnFallback: true }).catch((error) => {
          console.error('[DeepLink] Initial URL error:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Brand.cream },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="choose-account" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="property-details"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="location-selector" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post-request" options={{ presentation: 'card' }} />
        <Stack.Screen name="chat" options={{ presentation: 'card' }} />
        <Stack.Screen name="book-viewing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-activity" options={{ presentation: 'card' }} />
        <Stack.Screen name="landlord-dashboard" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-property" options={{ presentation: 'card' }} />
        <Stack.Screen
          name="account-created"
          options={{ presentation: 'card', animation: 'fade' }}
        />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="help" options={{ presentation: 'card' }} />
        <Stack.Screen name="faq" options={{ presentation: 'card' }} />
        <Stack.Screen name="about" options={{ presentation: 'card' }} />
        <Stack.Screen name="legal/privacy" options={{ presentation: 'card' }} />
        <Stack.Screen name="legal/terms" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile-edit" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="ai-chat" options={{ presentation: 'card' }} />
        <Stack.Screen name="admin-verifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="reset-password" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default SENTRY_ENABLED && SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
