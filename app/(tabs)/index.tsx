import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Brand } from '../../constants/Colors';
import { POPULAR_CITIES } from '../../constants/locations';
import { PropertyCard } from '../../components/property/PropertyCard';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { sortByProximity, DEFAULT_MAP_CENTER } from '../../lib/coordinates';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { WebFooter } from '../../components/navigation/WebFooter';

export default function HomeScreen() {
  const {
    properties,
    userName,
    setFilters,
    filters,
    conversations,
    viewings,
    isOffline,
    hasCachedProperties,
    propertiesLoading,
    refreshProperties,
  } = useApp();

  const { isDesktop, isMobile } = useResponsive();

  const totalUnread =
    conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) +
    viewings.filter(v => v.status === 'pending').length;

  const nearbyProperties = useMemo(() => {
    const available = properties.filter(p => p.available);
    const sorted = sortByProximity(available, DEFAULT_MAP_CENTER);
    return sorted.slice(0, isDesktop ? 9 : 6);
  }, [properties, isDesktop]);

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
    router.push('/notifications');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
      >
        <ResponsiveContainer>
          {/* Mobile Header (Hidden on Desktop since WebHeader is displayed) */}
          {isMobile ? (
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
                {totalUnread > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            </View>
          ) : (
            /* Desktop / Laptop Website Hero Banner */
            <View style={styles.desktopHero}>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark" size={14} color={Brand.terracotta} />
                <Text style={styles.heroBadgeText}>Verified Landlord Network</Text>
              </View>
              <Text style={styles.desktopHeroTitle}>
                Find Verified Accommodation in <Text style={{ color: Brand.terracotta }}>Zimbabwe</Text>
              </Text>
              <Text style={styles.desktopHeroSub}>
                Browse flats, cottages, student rooms, and family houses in Harare, Bulawayo, Mutare, and across Zimbabwe with zero middleman markups.
              </Text>

              {/* Desktop Quick City Pills */}
              <View style={styles.desktopCityPills}>
                <Text style={styles.desktopCityPillsLabel}>Popular:</Text>
                {POPULAR_CITIES.slice(0, 5).map(city => (
                  <TouchableOpacity
                    key={city}
                    style={styles.desktopCityPill}
                    onPress={() => filterByCity(city)}
                  >
                    <Ionicons name="location-sharp" size={12} color={Brand.terracotta} />
                    <Text style={styles.desktopCityPillText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isOffline && hasCachedProperties && (
            <OfflineBanner onRetry={() => void refreshProperties()} loading={propertiesLoading} />
          )}

          {/* Search Bar */}
          <TouchableOpacity
            style={[styles.searchBar, !isMobile && styles.searchBarDesktop]}
            onPress={openLocation}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Search accommodation by location"
          >
            <Ionicons name="location-outline" size={20} color={Brand.terracotta} />
            <Text style={styles.searchPlaceholder}>Where do you want to live in Zimbabwe? (City, suburb, neighborhood…)</Text>
            <View style={styles.filterIconBtn}>
              <Ionicons name="search" size={17} color={Brand.white} />
              {!isMobile && <Text style={styles.filterIconBtnText}>Search</Text>}
            </View>
          </TouchableOpacity>

          {/* Quick Filter Categories */}
          <View style={[styles.quickFilters, !isMobile && styles.quickFiltersDesktop]}>
            {['Location', 'Budget', 'Type', 'Bedrooms'].map(f => (
              <TouchableOpacity key={f} style={styles.filterPill} onPress={() => handleQuickFilter(f)}>
                <Text style={styles.filterPillText}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Available Near You Section */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Available Accommodation</Text>
              {!isMobile && (
                <Text style={styles.sectionSub}>Recently listed and verified homes ready for viewing</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>View all listings ({properties.length}) &rarr;</Text>
            </TouchableOpacity>
          </View>

          {/* Responsive Cards: Horizontal Strip on Mobile, Multi-Column Grid on Laptop/Desktop */}
          {isMobile ? (
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
                  style={{ width: 240 }}
                />
              )}
            />
          ) : (
            <View style={styles.desktopGrid}>
              {nearbyProperties.map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.desktopGridItem,
                    { width: isDesktop ? '31.8%' : '48%' },
                  ]}
                >
                  <PropertyCard
                    property={item}
                    onPress={() => openProperty(item.id)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Popular Locations Section */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Popular Cities & Towns</Text>
              {!isMobile && (
                <Text style={styles.sectionSub}>Quickly discover accommodation in key Zimbabwean centers</Text>
              )}
            </View>
          </View>

          <View style={[styles.locationGrid, !isMobile && styles.locationGridDesktop]}>
            {POPULAR_CITIES.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.locationPill, !isMobile && styles.locationPillDesktop]}
                onPress={() => filterByCity(city)}
                activeOpacity={0.8}
              >
                <View style={styles.cityIconCircle}>
                  <Ionicons name="business" size={14} color={Brand.terracotta} />
                </View>
                <Text style={styles.locationPillText}>{city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ResponsiveContainer>

        {/* Website Footer on Laptop/Tablet */}
        <WebFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  scrollContent: { paddingBottom: 60 },
  scrollContentDesktop: { paddingBottom: 0 },

  /* Mobile Header */
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.terracotta,
  },

  /* Desktop / Laptop Hero */
  desktopHero: {
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  desktopHeroTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: Brand.navy,
    textAlign: 'center',
    letterSpacing: -0.8,
    maxWidth: 720,
    lineHeight: 46,
  },
  desktopHeroSub: {
    fontSize: 16,
    color: Brand.gray500,
    textAlign: 'center',
    maxWidth: 640,
    marginTop: 12,
    lineHeight: 24,
  },
  desktopCityPills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
    justifyContent: 'center',
  },
  desktopCityPillsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.gray500,
  },
  desktopCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  desktopCityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  searchBarDesktop: {
    marginHorizontal: 0,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
  },
  searchPlaceholder: { flex: 1, color: Brand.gray400, fontSize: 14 },
  filterIconBtn: {
    backgroundColor: Brand.terracotta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
  },
  filterIconBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Quick Filters */
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  quickFiltersDesktop: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 36,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Brand.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  filterPillText: { fontSize: 13, color: Brand.navy, fontWeight: '600' },

  /* Sections */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 28,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Brand.navy },
  sectionSub: { fontSize: 13, color: Brand.gray500, marginTop: 2 },
  seeAll: { fontSize: 13, color: Brand.terracotta, fontWeight: '700' },

  /* Desktop Multi-Column Grid */
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  desktopGridItem: {
    marginBottom: 10,
  },

  /* Location Grid */
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  locationGridDesktop: {
    paddingHorizontal: 0,
    gap: 14,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  locationPillDesktop: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
  },
  cityIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.terracotta + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPillText: { fontSize: 13, color: Brand.navy, fontWeight: '700' },
});
