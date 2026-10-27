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
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Brand } from '../../constants/Colors';
import type { PropertyFilters, SearchFilters } from '../../types';
import { FilterModal } from '../../components/search/FilterModal';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { aiSearch } from '../../lib/ai';
import { PropertyMapView } from '../../components/property/PropertyMapView';
const SORT_OPTIONS = ['Newest', 'Price Low→High', 'Price High→Low', 'Rating'];

function PropertyThumbnail({ uri }: { uri?: string }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <View style={styles.cardImageFallback}>
        <Ionicons name="home-outline" size={30} color={Brand.gray400} />
        <Text style={styles.cardImageFallbackText}>Photo unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.cardImage}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      onError={() => setFailedUri(uri)}
    />
  );
}

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
  const inputRef = useRef<any>(null);

  const handleWhatsAppFromExplore = (p: typeof sortedResults[0], e: any) => {
    e.stopPropagation?.();
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
  };
  const allCities = useMemo(
    () => [...new Set(properties.map(property => property.city))].sort(),
    [properties],
  );

  const citySuggestions = useMemo(() => {
    if (!q.trim()) return [];
    return allCities.filter(c => c.toLowerCase().includes(q.toLowerCase()));
  }, [allCities, q]);

  useEffect(() => {
    const search = q.trim() || undefined;
    if (filters.search === search) return;
    const timeout = setTimeout(() => setFilters({ ...filters, search }), 350);
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
    if (isSupabaseEnabled) return filteredProperties;
    const lower = q.toLowerCase().trim();
    return filteredProperties.filter(p => {
      if (!p.available) return false;
      if (!lower) return true;
      return (
        p.city.toLowerCase().includes(lower) ||
        p.suburb.toLowerCase().includes(lower) ||
        p.title.toLowerCase().includes(lower) ||
        p.propertyType.toLowerCase().includes(lower) ||
        (p.description || '').toLowerCase().includes(lower)
      );
    });
  }, [filteredProperties, isSupabaseEnabled, q]);

  const sortedResults = useMemo(() =>
    [...results].sort((a, b) => {
      switch (sortOption) {
        case 'Price Low→High': return a.price - b.price;
        case 'Price High→Low': return b.price - a.price;
        case 'Rating': return (b.rating ?? 0) - (a.rating ?? 0);
        default: return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      }
    }), [results, sortOption]);

  const openProperty = (id: string) => {
    router.push(`/property-details?id=${id}`);
  };

  const handleSort = () => {
    Alert.alert('Sort Properties', 'Choose how you want to sort listings', [
      ...SORT_OPTIONS.map(opt => ({ text: opt, onPress: () => setSortOption(opt) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleApplyFilters = (updated: Partial<SearchFilters>) => {
    const newFilters: PropertyFilters = { ...filters, ...updated };
    if (updated.propertyType === 'all') newFilters.propertyType = 'any';
    if (updated.minPrice !== undefined) newFilters.budgetMin = updated.minPrice;
    if (updated.maxPrice !== undefined) newFilters.budgetMax = updated.maxPrice;
    if (updated.bedrooms !== undefined) newFilters.bedrooms = updated.bedrooms;
    if (updated.furnishedOnly !== undefined) newFilters.furnished = updated.furnishedOnly;
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
    setAiLoading(true);
    try {
      const result = await aiSearch(query, allCities);
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
            placeholder="Enter city e.g. Masvingo, Harare…"
            placeholderTextColor={Brand.gray400}
            value={q}
            onChangeText={text => { setQ(text); setShowSuggestions(text.trim().length > 0); }}
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

      {aiNote && (
        <View style={styles.cityBanner}>
          <Ionicons name="sparkles" size={15} color={Brand.terracotta} />
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
              <Ionicons name="sparkles-outline" size={11} color={Brand.white} />
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

  const renderPropertyCard = useCallback(({ item }: { item: typeof sortedResults[0] }) => {
    const amenities = (item.amenities || []).map(a => a.toLowerCase());
    const hasBorehole = amenities.some(a => a.includes('borehole') || a.includes('tank'));
    const hasSolar = amenities.some(a => a.includes('solar') || a.includes('inverter') || a.includes('generator'));
    const hasDurawall = amenities.some(a => a.includes('durawall') || a.includes('gate') || a.includes('security'));
    const hasWifi = amenities.some(a => a.includes('wifi') || a.includes('fibre') || a.includes('internet'));

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openProperty(item.id)}
        activeOpacity={0.88}
      >
        <PropertyThumbnail uri={item.images[0]} />
        <View style={styles.cardBody}>
          <View style={styles.priceRow}>
            <Text style={styles.cardPrice}>${item.price}<Text style={styles.perMonth}>/mo</Text></Text>
            {item.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={Brand.terracotta} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationMain} numberOfLines={1}>{item.suburb}, {item.city}</Text>
              <Text style={styles.locationProvince}>{item.province}</Text>
            </View>
          </View>
          <View style={styles.specsRow}>
            <View style={styles.spec}>
              <Ionicons name="bed-outline" size={12} color={Brand.gray500} />
              <Text style={styles.specText}>{item.bedrooms} bed</Text>
            </View>
            <View style={styles.specDot} />
            <View style={styles.spec}>
              <Ionicons name="water-outline" size={12} color={Brand.gray500} />
              <Text style={styles.specText}>{item.bathrooms} bath</Text>
            </View>
            <View style={styles.specDot} />
            <View style={styles.spec}>
              <Ionicons name="people-outline" size={12} color={Brand.gray500} />
              <Text style={styles.specText}>{item.maxOccupants} max</Text>
            </View>
          </View>

          {/* Zimbabwean Utility Badges */}
          {(hasBorehole || hasSolar || hasDurawall || hasWifi) && (
            <View style={styles.cardUtilityRow}>
              {hasBorehole && (
                <View style={[styles.cardUtilityPill, styles.cardUtilityWater]}>
                  <Ionicons name="water" size={10} color="#0284C7" />
                  <Text style={[styles.cardUtilityText, { color: '#0369A1' }]}>Borehole</Text>
                </View>
              )}
              {hasSolar && (
                <View style={[styles.cardUtilityPill, styles.cardUtilitySolar]}>
                  <Ionicons name="sunny" size={10} color="#D97706" />
                  <Text style={[styles.cardUtilityText, { color: '#B45309' }]}>Solar</Text>
                </View>
              )}
              {hasDurawall && (
                <View style={[styles.cardUtilityPill, styles.cardUtilitySecurity]}>
                  <Ionicons name="shield-checkmark" size={10} color="#059669" />
                  <Text style={[styles.cardUtilityText, { color: '#047857' }]}>Durawall</Text>
                </View>
              )}
              {hasWifi && (
                <View style={[styles.cardUtilityPill, styles.cardUtilityWifi]}>
                  <Ionicons name="wifi" size={10} color="#4F46E5" />
                  <Text style={[styles.cardUtilityText, { color: '#4338CA' }]}>Wi-Fi</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Row */}
          <View style={styles.cardActionRow}>
            <View style={styles.badgesRow}>
              <View style={styles.availBadge}>
                <Text style={styles.availBadgeText}>Available now</Text>
              </View>
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#2563EB" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
            </View>

            {item.landlord?.phone ? (
              <TouchableOpacity
                style={styles.cardWhatsAppButton}
                onPress={(e) => handleWhatsAppFromExplore(item, e)}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Chat on WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={13} color={Brand.white} />
                <Text style={styles.cardWhatsAppButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedResults]);

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

  card: {
    flexDirection: 'row', backgroundColor: Brand.white, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Brand.gray100,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: 110, height: 130 },
  cardImageFallback: {
    width: 110,
    height: 130,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardImageFallbackText: {
    color: Brand.gray500,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cardPrice: { fontSize: 17, fontWeight: '900', color: Brand.terracotta },
  perMonth: { fontSize: 11, fontWeight: '500', color: Brand.gray400 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Brand.navy, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginBottom: 6 },
  locationMain: { fontSize: 12, color: Brand.navy, fontWeight: '600' },
  locationProvince: { fontSize: 10, color: Brand.gray400 },
  specsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  specText: { fontSize: 11, color: Brand.gray500, fontWeight: '500' },
  specDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Brand.gray300 },
  badgesRow: { flexDirection: 'row', gap: 6 },
  availBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  availBadgeText: { color: '#16A34A', fontSize: 10, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#DBEAFE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  verifiedBadgeText: { color: '#2563EB', fontSize: 10, fontWeight: '700' },
  headerIconBtnActive: {
    backgroundColor: Brand.terracotta,
  },
  cardUtilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  cardUtilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cardUtilityWater: {
    backgroundColor: '#E0F2FE',
  },
  cardUtilitySolar: {
    backgroundColor: '#FEF3C7',
  },
  cardUtilitySecurity: {
    backgroundColor: '#D1FAE5',
  },
  cardUtilityWifi: {
    backgroundColor: '#EEF2FF',
  },
  cardUtilityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardWhatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardWhatsAppButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: Brand.white,
  },
});
