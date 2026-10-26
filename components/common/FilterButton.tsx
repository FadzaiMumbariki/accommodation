import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface FilterButtonProps {
  onPress: () => void;
  activeCount?: number;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ onPress, activeCount = 0 }) => {
  return (
    <TouchableOpacity
      style={[styles.button, activeCount > 0 && styles.buttonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name="options-outline"
        size={18}
        color={activeCount > 0 ? Brand.white : Brand.navy}
      />
      <Text style={[styles.text, activeCount > 0 && styles.textActive]}>Filters</Text>
      {activeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonActive: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.navy,
    marginLeft: 6,
  },
  textActive: {
    color: Brand.white,
  },
  badge: {
    backgroundColor: Brand.navy,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeText: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
