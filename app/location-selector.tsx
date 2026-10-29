import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Brand } from '../constants/Colors';
import { getCurrentUserLocation, findNearestLocation } from '../lib/locationService';

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
  const [isLocating, setIsLocating] = useState(false);

  const handleSelect = (province: string, city: string) => {
    setFilters({ ...filters, province, city, suburb: undefined });
    router.push('/(tabs)/explore');
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const result = await getCurrentUserLocation();
      if (result.status === 'granted') {
        const match = findNearestLocation(result.coords);
        setFilters({
          ...filters,
          city: match ? match.city : undefined,
          suburb: match ? match.suburb : undefined,
          referenceCoordinates: result.coords,
          nearby: true,
        });
        router.push('/(tabs)/explore');
      } else if (result.status === 'denied') {
        Alert.alert(
          'Location Permission Needed',
          'Please grant location access in your device settings to discover properties near your current position, or select your city from the list below.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Location Unavailable',
          result.errorMessage || 'Could not determine your GPS location. Please select a city from the list below.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLocating(false);
    }
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
      <StatusBar barStyle="dark-content" />

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

      {/* Current Location Option */}
      <TouchableOpacity
        style={styles.currentLocationBtn}
        onPress={handleUseCurrentLocation}
        activeOpacity={0.75}
        disabled={isLocating}
        accessibilityRole="button"
        accessibilityLabel="Use current location"
      >
        <View style={styles.currentLocationIcon}>
          {isLocating ? (
            <ActivityIndicator size="small" color={Brand.terracotta} />
          ) : (
            <Ionicons name="navigate" size={18} color={Brand.terracotta} />
          )}
        </View>
        <View style={styles.currentLocationContent}>
          <Text style={styles.currentLocationTitle}>Use Current Location</Text>
          <Text style={styles.currentLocationSubtitle}>
            {isLocating ? 'Detecting your GPS position…' : 'Find accommodation closest to where you are'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />
      </TouchableOpacity>

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
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.cream,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.terracotta + '40',
    gap: 12,
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.terracotta + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationContent: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 2,
  },
  currentLocationSubtitle: {
    fontSize: 12,
    color: Brand.gray600,
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
