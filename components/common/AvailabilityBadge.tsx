import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AvailabilityStatus } from '../../types';
import { Brand } from '../../constants/Colors';

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  availableFromDate?: string;
  size?: 'small' | 'medium' | 'large';
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  status,
  availableFromDate,
  size = 'small',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'available_now':
        return {
          dotColor: Brand.success,
          bgColor: Brand.successLight,
          textColor: Brand.success,
          borderColor: Brand.success + '40',
          label: 'Available now',
        };
      case 'available_from':
        return {
          dotColor: Brand.warning,
          bgColor: Brand.warningLight,
          textColor: Brand.warning,
          borderColor: Brand.warning + '40',
          label: availableFromDate ? `Available from ${availableFromDate}` : 'Available soon',
        };
      case 'occupied':
      default:
        return {
          dotColor: Brand.error,
          bgColor: Brand.errorLight,
          textColor: Brand.error,
          borderColor: Brand.error + '40',
          label: 'Occupied',
        };
    }
  };

  const config = getBadgeConfig();

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
          paddingVertical: isSmall ? 3 : isLarge ? 6 : 4,
          borderRadius: isLarge ? 20 : 12,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: config.dotColor,
            width: isSmall ? 6 : isLarge ? 10 : 8,
            height: isSmall ? 6 : isLarge ? 10 : 8,
            borderRadius: 999,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          {
            color: config.textColor,
            fontSize: isSmall ? 11 : isLarge ? 14 : 12,
            fontWeight: isLarge ? '700' : '600',
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: 6,
  },
  label: {
    letterSpacing: -0.1,
  },
});
