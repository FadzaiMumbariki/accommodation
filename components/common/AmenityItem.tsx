import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { getAmenityById } from '../../constants/amenities';

interface AmenityItemProps {
  amenityId: string;
  size?: 'compact' | 'standard';
}

export const AmenityItem: React.FC<AmenityItemProps> = ({
  amenityId,
  size = 'standard',
}) => {
  const item = getAmenityById(amenityId);
  const name = item ? item.name : amenityId.replace(/_/g, ' ');
  const icon = (item ? item.icon : 'checkmark-circle-outline') as keyof typeof Ionicons.glyphMap;

  const isCompact = size === 'compact';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={[styles.iconCircle, isCompact && styles.iconCircleCompact]}>
        <Ionicons
          name={icon}
          size={isCompact ? 14 : 18}
          color={Brand.terracotta}
        />
      </View>
      <Text
        style={[styles.name, isCompact && styles.nameCompact]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginRight: 8,
    marginBottom: 8,
  },
  containerCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconCircleCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: Brand.navy,
  },
  nameCompact: {
    fontSize: 11,
  },
});
