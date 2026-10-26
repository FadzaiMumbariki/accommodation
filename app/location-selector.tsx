import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Brand } from '../constants/Colors';

const LOCATION_GROUPS = [
  {
    province: 'Harare Province',
    cities: ['Harare', 'Chitungwiza', 'Epworth', 'Ruwa', 'Norton'],
  },
  {
    province: 'Bulawayo',
    cities: ['Bulawayo'],
  },
  {
    province: 'Manicaland',
    cities: ['Mutare', 'Rusape', 'Chipinge', 'Nyanga'],
  },
  {
    province: 'Mashonaland Central',
    cities: ['Bindura', 'Shamva', 'Guruve', 'Mazowe'],
  },
  {
    province: 'Midlands',
    cities: ['Gweru', 'Kwekwe', 'Zvishavane', 'Shurugwi'],
  },
  {
    province: 'Matabeleland North',
    cities: ['Victoria Falls', 'Hwange', 'Lupane'],
  },
  {
    province: 'Matabeleland South',
    cities: ['Gwanda', 'Beitbridge', 'Plumtree'],
  },
  {
    province: 'Masvingo',
    cities: ['Masvingo', 'Chiredzi', 'Zaka'],
  },
];

export default function LocationSelectorScreen() {
  const { setFilters, filters } = useApp();
  const [search, setSearch] = useState('');

  const handleSelect = (province: string, city: string) => {
    setFilters({ ...filters, province, city, suburb: undefined });
    router.push('/(tabs)/explore');
  };

  const filteredGroups = search.trim()
    ? LOCATION_GROUPS.map((group) => ({
        ...group,
        cities: group.cities.filter((c) =>
          c.toLowerCase().includes(search.toLowerCase()) ||
          group.province.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((group) => group.cities.length > 0)
    : LOCATION_GROUPS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where do you want to stay?</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={Brand.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search province, city or suburb"
          placeholderTextColor={Brand.gray400}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear location search"
          >
            <Ionicons name="close-circle" size={16} color={Brand.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filteredGroups.map((group) => (
          <View key={group.province} style={styles.groupContainer}>
            {/* Province Header */}
            <View style={styles.provinceHeaderRow}>
              <Text style={styles.provinceTitle}>{group.province}</Text>
              <Ionicons name="chevron-down" size={14} color={Brand.gray400} />
            </View>

            {/* Cities in Province */}
            {group.cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.cityRow}
                onPress={() => handleSelect(group.province, city)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={13} color={Brand.gray400} />
                <Text style={styles.cityName}>{city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Brand.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.cream,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Brand.navy,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  groupContainer: {
    marginBottom: 20,
  },
  provinceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray100,
  },
  provinceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 6,
  },
  cityName: {
    fontSize: 13,
    color: Brand.navy,
    fontWeight: '500',
  },
});
