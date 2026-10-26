import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ViewingStatus, RequestStatus } from '../../types';
import { Brand } from '../../constants/Colors';

type StatusBadgeStatus = ViewingStatus | RequestStatus | 'declined' | 'fulfilled';

interface StatusBadgeProps {
  status: StatusBadgeStatus;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const getConfig = () => {
    switch (status) {
      case 'confirmed':
        return { bg: Brand.successLight, text: Brand.success, label: 'Confirmed' };
      case 'completed':
        return { bg: Brand.infoLight, text: Brand.info, label: 'Completed' };
      case 'rejected':
      case 'declined':
        return { bg: Brand.errorLight, text: Brand.error, label: 'Rejected' };
      case 'cancelled':
        return { bg: Brand.errorLight, text: Brand.error, label: 'Cancelled' };
      case 'paused':
        return { bg: Brand.creamDark, text: Brand.terracotta, label: 'Paused' };
      case 'active':
        return { bg: Brand.successLight, text: Brand.success, label: 'Active' };
      case 'matched':
        return { bg: Brand.infoLight, text: Brand.info, label: 'Matched' };
      case 'fulfilled':
        return { bg: Brand.infoLight, text: Brand.info, label: 'Fulfilled' };
      case 'closed':
        return { bg: Brand.gray100, text: Brand.gray500, label: 'Closed' };
      case 'expired':
        return { bg: Brand.errorLight, text: Brand.error, label: 'Expired' };
      case 'pending':
      default:
        return { bg: Brand.warningLight, text: Brand.warning, label: 'Pending' };
    }
  };

  const config = getConfig();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? 11 : 13,
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
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
