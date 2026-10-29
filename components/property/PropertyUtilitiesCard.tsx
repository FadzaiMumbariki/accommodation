/**
 * PropertyUtilitiesCard — extracted from property-details.tsx.
 * Shows the four utility/infrastructure highlights for a property:
 * Water Supply, Power Backup, Property Security, Connectivity.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface PropertyUtilitiesCardProps {
  amenities: string[];
}

export function PropertyUtilitiesCard({ amenities }: PropertyUtilitiesCardProps) {
  const a = amenities.map((x) => x.toLowerCase());

  const waterDesc = a.some((x) => x.includes('borehole'))
    ? 'Borehole Water & Pressure Tank'
    : a.some((x) => x.includes('water'))
    ? 'Storage Water Tank Available'
    : 'Municipal Council Water';

  const powerDesc = a.some((x) => x.includes('solar'))
    ? 'Solar Power Backup Installed'
    : a.some((x) => x.includes('inverter'))
    ? 'Inverter & Battery Backup'
    : a.some((x) => x.includes('generator'))
    ? 'Generator Backup Available'
    : 'Standard ZESA Electricity';

  const securityDesc =
    a.some((x) => x.includes('durawall') || x.includes('wall'))
      ? 'Walled & Gated (Durawall)'
      : a.some((x) => x.includes('security') || x.includes('gate'))
      ? 'Secure Gated Compound'
      : 'Standard Boundary Security';

  const connectivityDesc =
    a.some((x) => x.includes('wifi') || x.includes('fibre') || x.includes('internet'))
      ? 'High-speed Wi-Fi / Fibre Ready'
      : 'Mobile Network Coverage';

  const items: {
    bg: string;
    iconColor: string;
    iconName: keyof typeof Ionicons.glyphMap;
    title: string;
    desc: string;
  }[] = [
    { bg: '#E0F2FE', iconColor: '#0284C7', iconName: 'water', title: 'Water Supply', desc: waterDesc },
    { bg: '#FEF3C7', iconColor: '#D97706', iconName: 'sunny', title: 'Power Backup', desc: powerDesc },
    { bg: '#D1FAE5', iconColor: '#059669', iconName: 'shield-checkmark', title: 'Property Security', desc: securityDesc },
    { bg: '#EEF2FF', iconColor: '#4F46E5', iconName: 'wifi', title: 'Connectivity', desc: connectivityDesc },
  ];

  return (
    <View style={styles.utilitiesCard}>
      {items.map((item, idx) => (
        <React.Fragment key={item.title}>
          {idx > 0 && <View style={styles.utilityDivider} />}
          <View style={styles.utilityItem}>
            <View style={[styles.utilityIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.iconName} size={18} color={item.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.utilityTitle}>{item.title}</Text>
              <Text style={styles.utilityDesc}>{item.desc}</Text>
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  utilitiesCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginTop: 6,
    marginBottom: 8,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  utilityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityTitle: { fontSize: 13, fontWeight: '800', color: Brand.navy },
  utilityDesc: { fontSize: 12, color: Brand.gray600, marginTop: 1 },
  utilityDivider: { height: 1, backgroundColor: Brand.gray100, marginVertical: 4 },
});
