import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface SafetyBannerProps {
  compact?: boolean;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ compact = false }) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.iconWrapper}>
        <Ionicons name="shield-checkmark" size={compact ? 18 : 22} color={Brand.terracotta} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Safety Verification Notice</Text>
        <Text style={styles.text}>
          Never send money or paying deposit before physically verifying the property and meeting the landlord in person.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: Brand.terracotta + '30',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
  },
  containerCompact: {
    padding: 10,
    marginVertical: 6,
    borderRadius: 10,
  },
  iconWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 3,
  },
  text: {
    fontSize: 12,
    color: Brand.gray500,
    lineHeight: 17,
  },
});
