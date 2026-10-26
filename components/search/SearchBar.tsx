import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onPress?: () => void;
  editable?: boolean;
  onFilterPress?: () => void;
  filterActiveCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChangeText,
  placeholder = 'Where do you want to live?',
  onPress,
  editable = true,
  onFilterPress,
  filterActiveCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={editable ? 1 : 0.8}
        onPress={onPress}
        style={styles.inputWrapper}
        accessibilityRole="button"
        accessibilityLabel="Search accommodation"
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={Brand.terracotta}
          style={styles.searchIcon}
        />
        {editable ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Brand.gray400}
            style={styles.input}
            returnKeyType="search"
          />
        ) : (
          <Text style={[styles.placeholderText, value ? styles.valueText : null]}>
            {value || placeholder}
          </Text>
        )}
        {editable && value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText && onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={Brand.gray400} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {onFilterPress && (
        <TouchableOpacity
          style={[styles.filterButton, filterActiveCount > 0 && styles.filterButtonActive]}
          onPress={onFilterPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterActiveCount > 0 ? Brand.white : Brand.navy}
          />
          {filterActiveCount > 0 && (
            <View style={styles.filterDot} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Brand.navy,
    fontWeight: '500',
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    fontSize: 15,
    color: Brand.gray400,
    fontWeight: '400',
  },
  valueText: {
    color: Brand.navy,
    fontWeight: '600',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Brand.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
    position: 'relative',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.cream,
  },
});
