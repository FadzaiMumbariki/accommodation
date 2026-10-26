import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface OfflineBannerProps {
  onRetry: () => void;
  loading: boolean;
}

export function OfflineBanner({ onRetry, loading }: OfflineBannerProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={15} color="#92400E" />
      <Text style={styles.message}>Offline mode — showing saved listings</Text>
      <TouchableOpacity
        onPress={onRetry}
        disabled={loading}
        style={styles.retryButton}
        accessibilityRole="button"
        accessibilityLabel="Retry loading listings"
      >
        <Ionicons name="refresh" size={15} color={Brand.terracotta} />
        <Text style={styles.retryText}>{loading ? 'Retrying' : 'Retry'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.terracotta,
  },
});
