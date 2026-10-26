import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { FilterState, PropertyType } from '../../types';
import { AMENITIES_LIST } from '../../constants/amenities';
import { PrimaryButton } from '../common/PrimaryButton';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (updated: Partial<FilterState>) => void;
  onReset: () => void;
}

const PROPERTY_TYPES: { label: string; value: PropertyType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'House', value: 'house' },
  { label: 'Cottage', value: 'cottage' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Room', value: 'room' },
  { label: 'Flat', value: 'flat' },
  { label: 'Bedsitter', value: 'bedsitter' },
];

const PRICE_RANGES = [
  { label: 'Under $200', min: 0, max: 200 },
  { label: '$200 - $400', min: 200, max: 400 },
  { label: '$400 - $700', min: 400, max: 700 },
  { label: '$700+', min: 700, max: 2500 },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>(
    filters.propertyType && filters.propertyType !== 'any' ? filters.propertyType : 'all'
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(filters.minPrice ?? filters.budgetMin);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(filters.maxPrice ?? filters.budgetMax);
  const [bedrooms, setBedrooms] = useState<number | 'any'>(filters.bedrooms || 'any');
  const [availableNowOnly, setAvailableNowOnly] = useState<boolean>(filters.availableNowOnly || false);
  const [furnishedOnly, setFurnishedOnly] = useState<boolean>(filters.furnishedOnly || false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(filters.selectedAmenities || filters.amenities || []);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onApply({
      propertyType: selectedType === 'all' ? 'any' : selectedType,
      minPrice,
      maxPrice,
      budgetMin: minPrice,
      budgetMax: maxPrice,
      bedrooms,
      availableNowOnly,
      furnishedOnly,
      selectedAmenities,
      amenities: selectedAmenities,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedType('all');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setBedrooms('any');
    setAvailableNowOnly(false);
    setFurnishedOnly(false);
    setSelectedAmenities([]);
    onReset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <Ionicons name="close" size={24} color={Brand.navy} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filter Accommodation</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>&#128994; Available Now Only</Text>
                <Text style={styles.toggleDesc}>Hide currently occupied or upcoming places</Text>
              </View>
              <Switch
                value={availableNowOnly}
                onValueChange={setAvailableNowOnly}
                trackColor={{ false: '#E2E8F0', true: Brand.terracottaLight }}
                thumbColor={availableNowOnly ? Brand.terracotta : '#FFF'}
              />
            </View>

            <Text style={styles.sectionTitle}>Property Type</Text>
            <View style={styles.chipGrid}>
              {PROPERTY_TYPES.map((type) => {
                const isSelected = selectedType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Monthly Budget (USD)</Text>
            <View style={styles.chipGrid}>
              {PRICE_RANGES.map((range, idx) => {
                const isSelected = minPrice === range.min && maxPrice === range.max;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => {
                      if (isSelected) {
                        setMinPrice(undefined);
                        setMaxPrice(undefined);
                      } else {
                        setMinPrice(range.min);
                        setMaxPrice(range.max);
                      }
                    }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Bedrooms</Text>
            <View style={styles.chipGrid}>
              {(['any', 1, 2, 3, 4] as const).map((b) => {
                const isSelected = bedrooms === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.chipSmall, isSelected && styles.chipActive]}
                    onPress={() => setBedrooms(b)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {b === 'any' ? 'Any' : `${b}+`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Furnished Accommodation</Text>
                <Text style={styles.toggleDesc}>Include beds, tables, and kitchen items</Text>
              </View>
              <Switch
                value={furnishedOnly}
                onValueChange={setFurnishedOnly}
                trackColor={{ false: '#E2E8F0', true: Brand.terracottaLight }}
                thumbColor={furnishedOnly ? Brand.terracotta : '#FFF'}
              />
            </View>

            <Text style={styles.sectionTitle}>Key Amenities &amp; Utilities</Text>
            <View style={styles.chipGrid}>
              {AMENITIES_LIST.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <TouchableOpacity
                    key={amenity.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleAmenity(amenity.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {amenity.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title="Apply Filters"
              onPress={handleApply}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 42, 65, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.navy,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.terracotta,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
    marginTop: 18,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Brand.creamDark,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  chipSmall: {
    backgroundColor: Brand.creamDark,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  chipActive: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.navy,
  },
  chipTextActive: {
    color: Brand.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
  toggleDesc: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
