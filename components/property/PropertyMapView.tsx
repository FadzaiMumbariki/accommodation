import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Property } from '../../types';
import { Brand } from '../../constants/Colors';
import { getPropertyCoordinates, DEFAULT_MAP_CENTER } from '../../lib/coordinates';

interface PropertyMapViewProps {
  properties: Property[];
  onSelectProperty?: (property: Property) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties,
  onSelectProperty,
}) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    properties.length > 0 ? properties[0] : null
  );

  // Calculate center from properties or default
  const mapRegion = useMemo(() => {
    if (properties.length === 0) {
      return {
        ...DEFAULT_MAP_CENTER,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    const coords = properties.map((p) =>
      getPropertyCoordinates(p.city, p.suburb, p.id)
    );
    const avgLat = coords.reduce((acc, c) => acc + c.latitude, 0) / coords.length;
    const avgLng = coords.reduce((acc, c) => acc + c.longitude, 0) / coords.length;
    return {
      latitude: avgLat,
      longitude: avgLng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [properties]);

  const handleMarkerPress = (property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProperty(property);
    onSelectProperty?.(property);
  };

  const handleWhatsApp = (property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rawPhone = property.landlord?.phone;
    if (!rawPhone) return;
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '263' + cleanPhone.slice(1);
    }
    const msg = encodeURIComponent(
      `Hi, I saw your listing "${property.title}" in ${property.suburb}, ${property.city} ($${property.price}/month) on ImbaFind. Is it still available?`
    );
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${msg}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
    Linking.canOpenURL(appUrl)
      .then((can) => Linking.openURL(can ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  };

  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isMapsKeyMissing = !mapsApiKey;

  // Try to load native react-native-maps if on mobile and key is available
  let MapComponent: any = null;
  let MarkerComponent: any = null;

  if (Platform.OS !== 'web' && (Platform.OS === 'ios' || !isMapsKeyMissing)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Maps = require('react-native-maps');
      MapComponent = Maps.default;
      MarkerComponent = Maps.Marker;
    } catch {
      MapComponent = null;
    }
  }

  // Selected property utility highlights
  const selectedAmenities = (selectedProperty?.amenities || []).map((a) =>
    a.toLowerCase()
  );
  const hasBorehole = selectedAmenities.some(
    (a) => a.includes('borehole') || a.includes('tank')
  );
  const hasSolar = selectedAmenities.some(
    (a) => a.includes('solar') || a.includes('inverter') || a.includes('generator')
  );
  const hasDurawall = selectedAmenities.some(
    (a) => a.includes('durawall') || a.includes('gate') || a.includes('security')
  );
  const hasWifi = selectedAmenities.some(
    (a) => a.includes('wifi') || a.includes('fibre') || a.includes('internet')
  );

  return (
    <View style={styles.container}>
      {isMapsKeyMissing && (
        <View style={styles.missingKeyBanner}>
          <Ionicons name="warning-outline" size={16} color="#92400E" />
          <Text style={styles.missingKeyBannerText}>
            Google Maps API key not configured. Showing interactive location list.
          </Text>
        </View>
      )}
      {MapComponent && MarkerComponent ? (
        <MapComponent
          style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          showsUserLocation
          showsCompass
        >
          {properties.map((property) => {
            const coords = getPropertyCoordinates(
              property.city,
              property.suburb,
              property.id
            );
            const isSelected = selectedProperty?.id === property.id;
            return (
              <MarkerComponent
                key={property.id}
                coordinate={coords}
                onPress={() => handleMarkerPress(property)}
              >
                <View
                  style={[
                    styles.priceMarker,
                    isSelected && styles.priceMarkerSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.priceMarkerText,
                      isSelected && styles.priceMarkerTextSelected,
                    ]}
                  >
                    ${property.price}
                  </Text>
                </View>
              </MarkerComponent>
            );
          })}
        </MapComponent>
      ) : (
        /* Web or fallback interactive list-map */
        <View style={styles.webFallbackContainer}>
          <View style={styles.webFallbackHeader}>
            <Ionicons name="map" size={24} color={Brand.terracotta} />
            <Text style={styles.webFallbackTitle}>Interactive Location Map</Text>
            <Text style={styles.webFallbackSub}>
              Select a location pin below to preview the accommodation:
            </Text>
          </View>
          <View style={styles.pinsGrid}>
            {properties.map((p) => {
              const isSelected = selectedProperty?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.webPinButton,
                    isSelected && styles.webPinButtonSelected,
                  ]}
                  onPress={() => handleMarkerPress(p)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="location-sharp"
                    size={16}
                    color={isSelected ? Brand.white : Brand.terracotta}
                  />
                  <Text
                    style={[
                      styles.webPinText,
                      isSelected && styles.webPinTextSelected,
                    ]}
                  >
                    {p.suburb} • ${p.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Floating Bottom Preview Card */}
      {selectedProperty && (
        <View style={styles.previewCardContainer}>
          <TouchableOpacity
            style={styles.previewCard}
            activeOpacity={0.92}
            onPress={() => router.push(`/property-details?id=${selectedProperty.id}`)}
          >
            <Image
              source={{
                uri:
                  selectedProperty.images[0] ||
                  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />

            <View style={styles.previewContent}>
              <View style={styles.previewPriceRow}>
                <Text style={styles.previewPrice}>
                  ${selectedProperty.price}
                  <Text style={styles.previewPerMonth}>/mo</Text>
                </Text>
                <View style={styles.previewTypeBadge}>
                  <Text style={styles.previewTypeText}>
                    {selectedProperty.propertyType}
                  </Text>
                </View>
              </View>

              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedProperty.title}
              </Text>

              <View style={styles.previewLocationRow}>
                <Ionicons name="location-sharp" size={13} color={Brand.terracotta} />
                <Text style={styles.previewLocationText} numberOfLines={1}>
                  {selectedProperty.suburb}, {selectedProperty.city}
                </Text>
              </View>

              {/* Utility highlights on preview */}
              <View style={styles.previewUtilityRow}>
                {hasBorehole && (
                  <View style={[styles.utilityBadge, styles.waterBadge]}>
                    <Ionicons name="water" size={10} color="#0284C7" />
                    <Text style={styles.utilityBadgeText}>Borehole</Text>
                  </View>
                )}
                {hasSolar && (
                  <View style={[styles.utilityBadge, styles.solarBadge]}>
                    <Ionicons name="sunny" size={10} color="#D97706" />
                    <Text style={styles.utilityBadgeText}>Solar</Text>
                  </View>
                )}
                {hasDurawall && (
                  <View style={[styles.utilityBadge, styles.securityBadge]}>
                    <Ionicons name="shield-checkmark" size={10} color="#059669" />
                    <Text style={styles.utilityBadgeText}>Walled</Text>
                  </View>
                )}
                {hasWifi && (
                  <View style={[styles.utilityBadge, styles.wifiBadge]}>
                    <Ionicons name="wifi" size={10} color="#4F46E5" />
                    <Text style={styles.utilityBadgeText}>Wi-Fi</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.previewActionsRow}>
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() =>
                    router.push(`/property-details?id=${selectedProperty.id}`)
                  }
                >
                  <Text style={styles.viewDetailsBtnText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={14} color={Brand.navy} />
                </TouchableOpacity>

                {selectedProperty.landlord?.phone && (
                  <TouchableOpacity
                    style={styles.whatsAppBtn}
                    onPress={() => handleWhatsApp(selectedProperty)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color={Brand.white} />
                    <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8ECEF',
  },
  priceMarker: {
    backgroundColor: Brand.white,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.terracotta,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  priceMarkerSelected: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.white,
    transform: [{ scale: 1.15 }],
  },
  priceMarkerText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.terracotta,
  },
  priceMarkerTextSelected: {
    color: Brand.white,
  },
  webFallbackContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
    backgroundColor: Brand.cream,
  },
  webFallbackHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
    marginTop: 6,
  },
  webFallbackSub: {
    fontSize: 13,
    color: Brand.gray600,
    marginTop: 4,
  },
  pinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  webPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  webPinButtonSelected: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  webPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.navy,
  },
  webPinTextSelected: {
    color: Brand.white,
  },
  previewCardContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 16,
    overflow: 'hidden',
    width: Math.min(SCREEN_WIDTH - 32, 420),
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  previewImage: {
    width: 110,
    height: '100%',
    backgroundColor: Brand.gray200,
  },
  previewContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  previewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: Brand.navy,
  },
  previewPerMonth: {
    fontSize: 11,
    fontWeight: '500',
    color: Brand.gray500,
  },
  previewTypeBadge: {
    backgroundColor: Brand.cream,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.navy,
    textTransform: 'capitalize',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLocationText: {
    fontSize: 11,
    color: Brand.gray600,
  },
  previewUtilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 2,
  },
  utilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  waterBadge: {
    backgroundColor: '#E0F2FE',
  },
  solarBadge: {
    backgroundColor: '#FEF3C7',
  },
  securityBadge: {
    backgroundColor: '#D1FAE5',
  },
  wifiBadge: {
    backgroundColor: '#EEF2FF',
  },
  utilityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Brand.navy,
  },
  previewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  viewDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Brand.gray100,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.navy,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsAppBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.white,
  },
  missingKeyBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missingKeyBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
});
