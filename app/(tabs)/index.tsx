import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Brand } from '../../constants/Colors';
import { POPULAR_CITIES } from '../../constants/locations';
import { PropertyCard } from '../../components/property/PropertyCard';
import { OfflineBanner } from '../../components/common/OfflineBanner';

export default function HomeScreen() {
  const {
    properties,
    userName,
    setFilters,
    filters,
    conversations,
    isOffline,
    hasCachedProperties,
    propertiesLoading,
    refreshProperties,
  } = useApp();

  const nearbyProperties = properties.filter(p => p.available).slice(0, 6);

  const openProperty = (id: string) => {
    router.push(`/property-details?id=${id}`);
  };

  const openLocation = () => router.push('/location-selector');

  const filterByCity = (city: string) => {
    setFilters({ suburb: undefined, province: undefined, city });
    router.push('/(tabs)/explore');
  };

  const handleQuickFilter = (filterType: string) => {
    if (filterType === 'Location') {
      router.push('/location-selector');
      return;
    }
    if (filterType === 'Budget') {
      setFilters({ ...filters, budgetMin: 0, budgetMax: 200 });
    } else if (filterType === 'Type') {
      setFilters({ ...filters, propertyType: 'house' });
    } else if (filterType === 'Bedrooms') {
      setFilters({ ...filters, bedrooms: 2 });
    }
    router.push('/(tabs)/explore');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleNotifications = () => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    Alert.alert(
      'Notifications',
      totalUnread > 0
        ? `You have ${totalUnread} new message${totalUnread === 1 ? '' : 's'}`
        : "You're up to date! No new notifications."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/choose-account')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Change account type"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}, {userName}</Text>
          <Text style={styles.headerTitle}>Find your next home</Text>
          <Text style={styles.headerSub}>Available accommodation across Zimbabwe</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={handleNotifications}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="View notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={Brand.navy} />
        </TouchableOpacity>
      </View>

      {isOffline && hasCachedProperties && (
        <OfflineBanner onRetry={() => void refreshProperties()} loading={propertiesLoading} />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={openLocation}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Search accommodation by location"
        >
          <Ionicons name="location-outline" size={18} color={Brand.terracotta} />
          <Text style={styles.searchPlaceholder}>Where do you want to live?</Text>
          <View style={styles.filterIconBtn}>
            <Ionicons name="search" size={16} color={Brand.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.quickFilters}>
          {['Location', 'Budget', 'Type', 'Bedrooms'].map(f => (
            <TouchableOpacity key={f} style={styles.filterPill} onPress={() => handleQuickFilter(f)}>
              <Text style={styles.filterPillText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available near you</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={nearbyProperties}
          keyExtractor={p => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
          renderItem={({ item }) => (
            <PropertyCard
              key={item.id}
              property={item}
              onPress={() => openProperty(item.id)}
              horizontal
              style={{ width: 220 }}
            />
          )}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular locations</Text>
        </View>

        <View style={styles.locationGrid}>
          {POPULAR_CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={styles.locationPill}
              onPress={() => filterByCity(city)}
            >
              <Ionicons name="location" size={14} color={Brand.terracotta} />
              <Text style={styles.locationPillText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  greeting: { fontSize: 13, color: Brand.gray500, fontWeight: '500' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Brand.navy, marginTop: 2 },
  headerSub: { fontSize: 13, color: Brand.gray400, marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Brand.white, marginHorizontal: 20,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10,
  },
  searchPlaceholder: { flex: 1, color: Brand.gray400, fontSize: 14 },
  filterIconBtn: {
    backgroundColor: Brand.terracotta, width: 32, height: 32,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  quickFilters: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20,
    marginTop: 16, marginBottom: 24,
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Brand.white, borderRadius: 20,
    borderWidth: 1, borderColor: Brand.gray200,
  },
  filterPillText: { fontSize: 13, color: Brand.navy, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 14,
    marginTop: 28,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Brand.navy },
  seeAll: { fontSize: 13, color: Brand.terracotta, fontWeight: '600' },
  locationGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 20, marginBottom: 32,
  },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Brand.white, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: Brand.gray200,
  },
  locationPillText: { fontSize: 13, color: Brand.navy, fontWeight: '600' },
});
