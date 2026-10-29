import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Brand } from '../../constants/Colors';
import type { Property, PropertyFilters, PropertyType, SearchFilters } from '../../types';
import { FilterModal } from '../../components/search/FilterModal';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { aiSearch } from '../../lib/ai';
import { hasRealAiSession, aiUnavailableMessage } from '../../lib/aiAvailability';
import { filterMockProperties } from '../../lib/propertyFilters';
import { PropertyMapView } from '../../components/property/PropertyMapView';
import { PropertyExploreCard } from '../../components/property/PropertyExploreCard';
const SORT_OPTIONS = ['Nearby', 'Newest', 'Price Low→High', 'Price High→Low', 'Rating'];


export default function ExploreScreen() {
  const {
    filteredProperties,
    setFilters,
    filters,
    isOffline,
    hasCachedProperties,
    propertiesLoading,
    refreshProperties,
    propertiesError,
    hasMoreProperties,
    loadMoreProperties,
    properties,
  } = useApp();
  const { isSupabaseEnabled } = useAuth();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [q, setQ] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortOption, setSortOption] = useState<string>('Newest');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<{ query: string; summary: string; source: 'ai' | 'basic' } | null>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const openProperty = useCallback((id: string) => {
    router.push(`/property-details?id=${id}`);
  }, []);

  const handleWhatsAppFromExplore = useCallback((p: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rawPhone = p.landlord?.phone;
    if (!rawPhone) {
      openProperty(p.id);
      return;
    }
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '263' + cleanPhone.slice(1);
    }
    const defaultMsg = encodeURIComponent(
      `Hi, I saw your listing for "${p.title}" in ${p.suburb}, ${p.city} ($${p.price}/month) on ImbaFind. Is it still available?`
    );
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${defaultMsg}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
    Linking.canOpenURL(appUrl)
      .then(can => Linking.openURL(can ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  }, [openProperty]);
  const allCities = useMemo(
    () => [...new Set(properties.map(property => property.city))].sort(),
    [properties],
  );

  const citySuggestions = useMemo(() => {
    if (!q.trim()) return [];
    return allCities.filter(c => c.toLowerCase().includes(q.toLowerCase()));
  }, [allCities, q]);

  useEffect(() => {
    const trimmed = q.trim();
    const search = trimmed || undefined;
    const isNearby = /\b(?:near|nearby|close|around)\b/i.test(trimmed);

    // Detect multiple property types like "houses or apartments"
    const types: PropertyType[] = [];
    if (/\bhouses?\b/i.test(trimmed)) types.push('house');
    if (/\b(?:apartments?|flats?)\b/i.test(trimmed)) {
      if (!types.includes('apartment')) types.push('apartment');
      if (!types.includes('flat')) types.push('flat');
    }
    if (/\brooms?\b/i.test(trimmed)) types.push('room');
    if (/\bcottages?\b/i.test(trimmed)) types.push('cottage');
    if (/\bbedsitters?\b/i.test(trimmed)) types.push('bedsitter');

    const nextNearby = isNearby || filters.nearby;
    const nextTypes = types.length > 0 ? types : filters.propertyTypes;

    if (
      filters.search === search &&
      filters.nearby === nextNearby &&
      JSON.stringify(filters.propertyTypes) === JSON.stringify(nextTypes)
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      setFilters({
        ...filters,
        search,
        nearby: nextNearby,
        propertyTypes: nextTypes,
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [filters, q, setFilters]);

  const availableCountByCity = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProperties.forEach(p => {
      if (p.available) map[p.city] = (map[p.city] || 0) + 1;
    });
    return map;
  }, [filteredProperties]);

  const activeCity = filters.city;

  const results = useMemo(() => {
    const baseList = isSupabaseEnabled && filteredProperties.length > 0 ? filteredProperties : properties;
    return filterMockProperties(baseList, {
      ...filters,
      search: q.trim() || filters.search,
      nearby: sortOption === 'Nearby' || filters.nearby,
    });
  }, [filteredProperties, isSupabaseEnabled, properties, filters, q, sortOption]);

  const sortedResults = useMemo(() => {
    const isNearbyQuery = Boolean(filters.nearby || /\b(?:near|nearby|close|around)\b/i.test(q));
    const effectiveSort = sortOption === 'Newest' && isNearbyQuery ? 'Nearby' : sortOption;

    return [...results].sort((a, b) => {
      switch (effectiveSort) {
        case 'Nearby':
          return (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999);
        case 'Price Low→High':
          return a.price - b.price;
        case 'Price High→Low':
          return b.price - a.price;
        case 'Rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        default:
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      }
    });
  }, [filters.nearby, q, results, sortOption]);


  const handleSort = () => {
    Alert.alert('Sort Properties', 'Choose how you want to sort listings', [
      ...SORT_OPTIONS.map(opt => ({ text: opt, onPress: () => setSortOption(opt) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleApplyFilters = (updated: Partial<SearchFilters>) => {
    const newFilters: PropertyFilters = { ...filters, ...updated };
    if (updated.propertyType === 'all') newFilters.propertyType = 'any';
    if (updated.budgetMin !== undefined) newFilters.budgetMin = updated.budgetMin;
    if (updated.budgetMax !== undefined) newFilters.budgetMax = updated.budgetMax;
    if (updated.bedrooms !== undefined) newFilters.bedrooms = updated.bedrooms;
    if (updated.furnished !== undefined) newFilters.furnished = updated.furnished;
    if ((updated.amenities?.length ?? 0) > 0) newFilters.amenities = updated.amenities;
    setFilters(newFilters);
  };

  const handleResetFilters = () => { setFilters({}); setQ(''); setAiNote(null); };

  // Plain-English search ("2 bed flat in Bulawayo under $300"). The AI only returns filters; the
  // listings shown always come from the app's own data.
  const runAiSearch = async () => {
    const query = q.trim();
    if (!query) {
      Alert.alert('AI search', 'Type what you are looking for first, e.g. "2 bedroom flat in Bulawayo under $300".');
      return;
    }
    // The AI Edge Functions enforce a per-user limit that requires a real signed-in account.
    // Anonymous and demo sessions cannot use AI, so prompt for sign-in instead of silently falling back.
    if (!(await hasRealAiSession())) {
      Alert.alert('Sign in to use AI search', aiUnavailableMessage('auth'));
      router.push({ pathname: '/login', params: { returnTo: '/(tabs)/explore' } });
      return;
    }
    setAiLoading(true);
    try {
      const result = await aiSearch(query, allCities);
      if (result.source === 'basic' && result.unavailable) {
        Alert.alert('AI unavailable', aiUnavailableMessage(result.unavailable));
      }
      if (Object.keys(result.filters).length === 0) {
        Alert.alert('No filters found', 'I could not turn that into filters. Try adding a city, bedrooms or a budget.');
        return;
      }
      setFilters(result.filters);
      setQ('');
      setShowSuggestions(false);
      setAiNote({ query, summary: result.summary, source: result.source });
    } finally {
      setAiLoading(false);
    }
  };

  const selectCity = (city: string) => {
    setQ(city);
    setShowSuggestions(false);
    setFilters({ ...filters, city, suburb: undefined });
    inputRef.current?.blur();
  };

  const clearCityFilter = () => {
    setFilters({ ...filters, city: undefined, suburb: undefined, province: undefined });
    setQ('');
  };

  // ── Everything above the list lives in ListHeaderComponent ────────────────
  const listHeader = (
    <View>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, showSuggestions && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color={Brand.terracotta} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search nearby houses, apartments, cities…"
            placeholderTextColor={Brand.gray400}
            value={q}
            onChangeText={text => {
              setQ(text);
              setShowSuggestions(text.trim().length > 0);
              if (/\b(?:near|nearby|close|around)\b/i.test(text) && sortOption !== 'Nearby') {
                setSortOption('Nearby');
              }
            }}
            onFocus={() => q.trim().length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <TouchableOpacity
              onPress={clearCityFilter}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Clear ${activeCity} location filter`}
            >
              <Ionicons name="close-circle" size={18} color={Brand.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && citySuggestions.length > 0 && (
          <View style={styles.dropdown}>
            {citySuggestions.map((city, idx) => (
              <TouchableOpacity
                key={city}
                style={[styles.dropdownItem, idx < citySuggestions.length - 1 && styles.dropdownItemBorder]}
                onPress={() => selectCity(city)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownLeft}>
                  <View style={styles.dropdownIcon}>
                    <Ionicons name="location" size={14} color={Brand.terracotta} />
                  </View>
                  <View>
                    <Text style={styles.dropdownCity}>{city}</Text>
                    <Text style={styles.dropdownCountry}>Zimbabwe</Text>
                  </View>
                </View>
                <View style={styles.dropdownBadge}>
                  <Text style={styles.dropdownBadgeText}>{availableCountByCity[city] ?? 0} available</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {showSuggestions && q.trim().length > 0 && citySuggestions.length === 0 && (
          <View style={styles.dropdown}>
            <View style={styles.dropdownItem}>
              <Ionicons name="search-outline" size={16} color={Brand.gray400} />
              <Text style={styles.noMatchText}>No cities found for &quot;{q}&quot;</Text>
            </View>
          </View>
        )}
      </View>

      {/* Active City Banner */}
      {activeCity && (
        <View style={styles.cityBanner}>
          <Ionicons name="location" size={15} color={Brand.terracotta} />
          <Text style={styles.cityBannerText}>
            Showing <Text style={styles.cityBannerBold}>{sortedResults.length}</Text>{' '}
            {sortedResults.length === 1 ? 'property' : 'properties'} in{' '}
            <Text style={styles.cityBannerBold}>{activeCity}</Text>
          </Text>
          <TouchableOpacity
            onPress={clearCityFilter}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${activeCity} location filter`}
          >
            <Ionicons name="close" size={16} color={Brand.gray500} />
          </TouchableOpacity>
        </View>
      )}

      {(sortOption === 'Nearby' || filters.nearby) && !activeCity && (
        <View style={styles.cityBanner}>
          <Ionicons name="navigate-circle" size={16} color={Brand.terracotta} />
          <Text style={styles.cityBannerText}>
            Showing <Text style={styles.cityBannerBold}>{sortedResults.length}</Text> nearby listings (sorted by distance)
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSortOption('Newest');
              setFilters({ ...filters, nearby: undefined });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear nearby sort"
          >
            <Ionicons name="close" size={16} color={Brand.gray500} />
          </TouchableOpacity>
        </View>
      )}

      {aiNote && (
        <View style={styles.cityBanner}>
          <Ionicons name="information-circle-outline" size={15} color={Brand.terracotta} />
          <Text style={styles.cityBannerText}>
            {aiNote.source === 'ai' ? 'AI understood' : 'Basic search understood'}:{' '}
            <Text style={styles.cityBannerBold}>{aiNote.summary}</Text>
            {aiNote.source === 'ai' ? ' (AI-generated, check the filters)' : ''}
          </Text>
          <TouchableOpacity
            onPress={handleResetFilters}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear AI search filters"
          >
            <Ionicons name="close" size={16} color={Brand.gray500} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 44, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6, alignItems: 'center' }}
        >
          <TouchableOpacity
            style={[styles.chip, styles.chipActive]}
            onPress={runAiSearch}
            disabled={aiLoading}
            accessibilityRole="button"
            accessibilityLabel="Search with AI"
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={Brand.white} />
            ) : (
              <Ionicons name="search-outline" size={11} color={Brand.white} />
            )}
            <Text style={[styles.chipText, styles.chipTextActive]}>AI search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={11} color={Brand.navy} />
            <Text style={styles.chipText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={handleSort}>
            <Ionicons name="swap-vertical" size={11} color={Brand.navy} />
            <Text style={styles.chipText}>{sortOption}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={{ height: 44, marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6, alignItems: 'center' }}
        >
          {(['any', 'house', 'apartment', 'flat', 'room', 'cottage', 'bedsitter'] as const).map((t) => {
            const isActive = t === 'any'
              ? !filters.propertyType || filters.propertyType === 'any'
              : filters.propertyType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilters({ ...filters, propertyType: t })}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {t === 'any' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {filters.budgetMax && (
            <TouchableOpacity style={[styles.chip, styles.chipActive]} onPress={() => setFilters({ ...filters, budgetMax: undefined })}>
              <Text style={[styles.chipText, styles.chipTextActive]}>Up to ${filters.budgetMax}</Text>
              <Ionicons name="close" size={11} color={Brand.white} />
            </TouchableOpacity>
          )}
          {filters.bedrooms && filters.bedrooms !== 'any' && (
            <TouchableOpacity style={[styles.chip, styles.chipActive]} onPress={() => setFilters({ ...filters, bedrooms: 'any' })}>
              <Text style={[styles.chipText, styles.chipTextActive]}>{filters.bedrooms} bed</Text>
              <Ionicons name="close" size={11} color={Brand.white} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Results count */}
      {!activeCity && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>{sortedResults.length} properties available</Text>
        </View>
      )}
    </View>
  );

  const renderPropertyCard = useCallback(
    ({ item }: { item: typeof sortedResults[0] }) => (
      <PropertyExploreCard
        property={item}
        onPress={openProperty}
        onWhatsAppPress={handleWhatsAppFromExplore}
      />
    ),
    [openProperty, handleWhatsAppFromExplore]
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header — stays fixed above the scrollable list */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(tabs)')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Find accommodation</Text>
          {activeCity && <Text style={styles.headerSub}>in {activeCity}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerIconBtn, viewMode === 'map' && styles.headerIconBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode(viewMode === 'list' ? 'map' : 'list');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'list' ? 'Switch to map view' : 'Switch to list view'}
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={20}
              color={viewMode === 'map' ? Brand.white : Brand.navy}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, styles.headerIconBtnAI]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/ai-chat');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Open AI chat search"
          >
            <Ionicons name="sparkles" size={18} color={Brand.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowFilterModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Ionicons name="options-outline" size={20} color={Brand.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {isOffline && hasCachedProperties && (
        <OfflineBanner onRetry={() => void refreshProperties()} loading={propertiesLoading} />
      )}

      {viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          {listHeader}
          <PropertyMapView properties={sortedResults} />
        </View>
      ) : (
        /* FlatList owns everything — no siblings competing for height */
        <FlatList
        data={sortedResults}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onEndReached={() => {
          if (hasMoreProperties) void loadMoreProperties();
        }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        renderItem={renderPropertyCard}
        ListEmptyComponent={
          propertiesLoading ? (
            <ActivityIndicator style={{ marginTop: 36 }} size="large" color={Brand.terracotta} />
          ) : propertiesError && !hasCachedProperties ? (
            <EmptyState
              title="Could not load properties"
              message={
                propertiesError.includes('Could not find the table') ||
                propertiesError.includes('schema cache')
                  ? 'The listings database is not available in this Supabase project. Apply the Supabase schema migrations, then retry.'
                  : 'Please check your connection and try again.'
              }
              icon="cloud-offline-outline"
              actionTitle="Retry"
              onAction={() => void refreshProperties()}
            />
          ) : (
            <EmptyState
              title={q ? `No results in "${q}"` : 'No properties found'}
              message={q ? `There are no available properties in "${q}". Try a nearby city or clear your search.` : 'Try adjusting your filters to find available accommodation.'}
              icon="home-outline"
              actionTitle="Clear Search & Filters"
              onAction={handleResetFilters}
            />
          )
        }
        ListFooterComponent={
          propertiesLoading && sortedResults.length > 0
            ? <ActivityIndicator style={{ marginVertical: 20 }} color={Brand.terracotta} />
            : hasMoreProperties
              ? <View style={{ height: 20 }} />
              : undefined
        }
      />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Brand.navy },
  headerSub: { fontSize: 12, color: Brand.terracotta, fontWeight: '600', marginTop: 1 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerIconBtnAI: {
    backgroundColor: Brand.terracotta,
  },

  searchWrapper: { paddingHorizontal: 16, marginBottom: 10, zIndex: 100 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.white,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    borderWidth: 1.5, borderColor: Brand.gray200,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchBarFocused: { borderColor: Brand.terracotta },
  searchInput: { flex: 1, fontSize: 14, color: Brand.navy },

  dropdown: {
    backgroundColor: Brand.white, borderRadius: 14, borderWidth: 1, borderColor: Brand.gray200,
    marginTop: 4, shadowColor: Brand.navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 8, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: Brand.gray100 },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dropdownIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Brand.terracotta + '15', alignItems: 'center', justifyContent: 'center',
  },
  dropdownCity: { fontSize: 14, fontWeight: '700', color: Brand.navy },
  dropdownCountry: { fontSize: 11, color: Brand.gray400, marginTop: 1 },
  dropdownBadge: { backgroundColor: Brand.success + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dropdownBadgeText: { fontSize: 11, fontWeight: '700', color: Brand.success },
  noMatchText: { fontSize: 13, color: Brand.gray500, marginLeft: 8 },

  cityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Brand.terracotta + '12', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Brand.terracotta + '25',
  },
  cityBannerText: { flex: 1, fontSize: 13, color: Brand.navy, fontWeight: '500' },
  cityBannerBold: { fontWeight: '800', color: Brand.terracotta },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Brand.white, paddingHorizontal: 10, height: 32,
    borderRadius: 8, borderWidth: 1, borderColor: Brand.gray200,
  },
  chipActive: { backgroundColor: Brand.terracotta, borderColor: Brand.terracotta },
  chipText: { fontSize: 11, fontWeight: '600', color: Brand.navy },
  chipTextActive: { color: Brand.white },

  resultsBar: { paddingHorizontal: 16, marginBottom: 12 },
  resultsText: { fontSize: 13, color: Brand.gray500, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingBottom: 110 },

  headerIconBtnActive: {
    backgroundColor: Brand.terracotta,
  },
});
