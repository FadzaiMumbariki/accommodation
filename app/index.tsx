import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';

import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // On web / laptops, immediately land on the website homepage to explore listings
    if (Platform.OS === 'web') {
      router.replace('/(tabs)');
      return;
    }

    const timer = setTimeout(() => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.centerContent}>
        <View style={styles.logoPin}>
          <View style={styles.logoPinInner}>
            <Ionicons name="home" size={42} color={Brand.white} />
          </View>
          <View style={styles.logoPinPoint} />
        </View>

        <View style={styles.brandRow}>
          <Text style={styles.brandImba}>Imba</Text>
          <Text style={styles.brandFind}>Find</Text>
        </View>
        <Text style={styles.tagline}>Find a place. Make it home.</Text>
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.arcSpinner}>
          <View style={styles.arcStroke} />
        </View>
      </View>
    </View>
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
  arcSpinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: Brand.terracotta,
    borderRightColor: Brand.terracotta,
    borderLeftColor: Brand.terracotta,
    transform: [{ rotate: '-30deg' }],
  },
  arcStroke: {
    display: 'none',
  },
});
