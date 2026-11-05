import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Brand } from '../../constants/Colors';
import { ErrorBoundary } from './ErrorBoundary';

interface TabErrorBoundaryProps {
  children: React.ReactNode;
  tabName: string;
}

/**
 * Specialized error boundary for tab screens that provides tab-specific error recovery.
 * Shows a contextual error message and allows users to navigate to other tabs.
 */
export function TabErrorBoundary({ children, tabName }: TabErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <View style={styles.iconWrap}>
              <Ionicons name="alert-circle-outline" size={48} color={Brand.terracotta} />
            </View>
            <Text style={styles.title}>{tabName} Unavailable</Text>
            <Text style={styles.message}>
              We encountered a problem loading this screen. Try navigating to another tab, or
              restart the app if this persists.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => router.replace('/(tabs)')}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={18} color={Brand.navy} />
                <Text style={styles.btnSecondaryText}>Go to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => router.replace('/(tabs)/explore')}
                activeOpacity={0.85}
              >
                <Ionicons name="search-outline" size={18} color={Brand.white} />
                <Text style={styles.btnText}>Browse Properties</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.terracottaLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Brand.gray500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.terracotta,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSecondary: {
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    shadowColor: Brand.navy,
    shadowOpacity: 0.06,
  },
  btnText: { color: Brand.white, fontSize: 15, fontWeight: '700' },
  btnSecondaryText: { color: Brand.navy, fontSize: 15, fontWeight: '700' },
});
