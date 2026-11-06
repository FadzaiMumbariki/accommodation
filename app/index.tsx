import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';

import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { session, loading } = useAuth();
  const [mountTime] = useState(() => Date.now());

  // useState keeps Animated.Value stable without triggering react-hooks/refs lint
  const [logoScale] = useState(() => new Animated.Value(0.6));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [pulseScale] = useState(() => new Animated.Value(1));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [textTranslateY] = useState(() => new Animated.Value(18));
  const [bottomOpacity] = useState(() => new Animated.Value(0));
  const [screenOpacity] = useState(() => new Animated.Value(1));

  // Entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5.5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle breathing pulse once entrance completes
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [logoOpacity, logoScale, pulseScale, textOpacity, textTranslateY, bottomOpacity]);

  // Handle transition timing after minimum display duration
  useEffect(() => {
    if (loading) return;

    // Ensure splash is showcased for at least 2600ms so users can enjoy the animation
    const MINIMUM_SPLASH_MS = 2600;
    const elapsed = Date.now() - mountTime;
    const remainingTime = Math.max(400, MINIMUM_SPLASH_MS - elapsed);

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      });
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [loading, session, mountTime, screenOpacity]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.logoPin,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoPinInner,
              {
                transform: [{ scale: pulseScale }],
              },
            ]}
          >
            <Ionicons name="home" size={42} color={Brand.white} />
          </Animated.View>
          <View style={styles.logoPinPoint} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brandImba}>Imba</Text>
            <Text style={styles.brandFind}>Find</Text>
          </View>
          <Text style={styles.tagline}>Find a place. Make it home.</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomContent, { opacity: bottomOpacity }]}>
        <ActivityIndicator size="small" color={Brand.terracotta} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPin: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPinInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Brand.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  logoPinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Brand.terracotta,
    marginTop: -6,
    marginLeft: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandImba: {
    fontSize: 40,
    fontWeight: '900',
    color: Brand.navy,
    letterSpacing: -0.5,
  },
  brandFind: {
    fontSize: 40,
    fontWeight: '900',
    color: Brand.terracotta,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: Brand.gray500,
    marginTop: 10,
    fontWeight: '500',
  },
  bottomContent: {
    position: 'absolute',
    bottom: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
