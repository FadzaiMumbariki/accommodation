import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PropertySafetyAdvisory: React.FC = () => {
  return (
    <View style={styles.safetyAlertCard}>
      <View style={styles.safetyIconBox}>
        <Ionicons name="shield-half" size={20} color="#D97706" />
      </View>
      <View style={styles.safetyAlertContent}>
        <Text style={styles.safetyAlertTitle}>Safety & Fraud Advisory</Text>
        <Text style={styles.safetyAlertText}>
          Never send rental deposits or viewing fees via EcoCash, Innbucks or bank transfer before
          physically inspecting this property with the landlord.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safetyAlertCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 14,
    marginVertical: 14,
    alignItems: 'flex-start',
  },
  safetyIconBox: {
    marginRight: 10,
    marginTop: 2,
  },
  safetyAlertContent: {
    flex: 1,
  },
  safetyAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  safetyAlertText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
});
