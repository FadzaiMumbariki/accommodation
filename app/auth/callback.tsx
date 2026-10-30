import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Brand } from '../../constants/Colors';
import { handleAuthRedirectUrl } from '../../lib/googleAuth';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallbackScreen() {
  const { session } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      if (session) {
        router.replace('/(tabs)');
        return;
      }

      try {
        const currentUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        if (currentUrl) {
          const success = await handleAuthRedirectUrl(currentUrl);
          if (isMounted) {
            if (success) {
              router.replace('/(tabs)');
            } else {
              router.replace('/login');
            }
          }
        } else if (isMounted) {
          router.replace('/login');
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[AuthCallback] Failed processing auth callback:', err);
        }
        if (isMounted) {
          router.replace('/login');
        }
      }
    }

    void processCallback();

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Brand.terracotta} />
      <Text style={styles.text}>Completing sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Brand.cream,
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Brand.navy,
  },
});
