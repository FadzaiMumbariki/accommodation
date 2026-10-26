import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface VerifiedBadgeProps {
  label?: string;
  size?: 'small' | 'medium';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  label = 'Verified',
  size = 'small',
}) => {
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}>
      <Ionicons
        name="shield-checkmark"
        size={isSmall ? 12 : 15}
        color={Brand.success}
        style={styles.icon}
      />
      <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.successLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Brand.success + '30',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 3,
  },
  text: {
    color: Brand.navy,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});
