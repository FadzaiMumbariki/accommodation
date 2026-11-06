import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface PropertySpecsCardProps {
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
}

export const PropertySpecsCard: React.FC<PropertySpecsCardProps> = ({
  bedrooms,
  bathrooms,
  maxOccupants,
}) => {
  return (
    <View style={styles.specsCard}>
      <View style={styles.specBox}>
        <Ionicons name="bed-outline" size={20} color={Brand.navy} />
        <Text style={styles.specValue}>{bedrooms}</Text>
        <Text style={styles.specTitle}>Bedrooms</Text>
      </View>
      <View style={styles.specDivider} />
      <View style={styles.specBox}>
        <Ionicons name="water-outline" size={20} color={Brand.navy} />
        <Text style={styles.specValue}>{bathrooms}</Text>
        <Text style={styles.specTitle}>Bathroom</Text>
      </View>
      <View style={styles.specDivider} />
      <View style={styles.specBox}>
        <Ionicons name="people-outline" size={20} color={Brand.navy} />
        <Text style={styles.specValue}>{maxOccupants}</Text>
        <Text style={styles.specTitle}>People</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  specsCard: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Brand.gray100,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  specBox: {
    alignItems: 'center',
    flex: 1,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.navy,
    marginTop: 4,
  },
  specTitle: {
    fontSize: 11,
    color: Brand.gray500,
    marginTop: 2,
    fontWeight: '500',
  },
  specDivider: {
    width: 1,
    height: 32,
    backgroundColor: Brand.gray200,
  },
});
