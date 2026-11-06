import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

export const AMENITY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  electricity: 'flash-outline',
  solar: 'sunny-outline',
  security: 'shield-checkmark-outline',
  parking: 'car-outline',
  garden: 'leaf-outline',
  borehole: 'water-outline',
  wifi: 'wifi-outline',
  furnished: 'bed-outline',
  aircon: 'snow-outline',
  generator: 'power-outline',
  dstv: 'tv-outline',
  kitchen: 'restaurant-outline',
  transport: 'bus-outline',
  pets: 'paw-outline',
  laundry: 'shirt-outline',
  fireplace: 'flame-outline',
  wall: 'business-outline',
  durawall: 'business-outline',
};

interface PropertyAmenitiesGridProps {
  amenities: string[];
}

export const PropertyAmenitiesGrid: React.FC<PropertyAmenitiesGridProps> = ({ amenities }) => {
  if (!amenities || amenities.length === 0) {
    return <Text style={styles.noAmenitiesText}>No amenities listed.</Text>;
  }

  return (
    <View style={styles.amenitiesGrid}>
      {amenities.map((a) => {
        const iconName = AMENITY_ICON_MAP[a.toLowerCase()] || 'checkmark-circle-outline';
        const label = a.charAt(0).toUpperCase() + a.slice(1);
        return (
          <View key={a} style={styles.amenityCard}>
            <Ionicons name={iconName} size={20} color={Brand.terracotta} />
            <Text style={styles.amenityLabel} numberOfLines={2}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  amenityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray100,
    gap: 8,
    minWidth: '45%',
    flex: 1,
  },
  amenityLabel: {
    fontSize: 13,
    color: Brand.navy,
    fontWeight: '500',
    flexShrink: 1,
  },
  noAmenitiesText: {
    fontSize: 13,
    color: Brand.gray500,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
