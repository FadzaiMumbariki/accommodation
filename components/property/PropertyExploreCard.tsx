import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import type { Property } from '../../types';

interface PropertyExploreCardProps {
  property: Property;
  onPress: (id: string) => void;
  onWhatsAppPress?: (property: Property) => void;
}

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

export const PropertyExploreCard = React.memo(function PropertyExploreCard({
  property,
  onPress,
  onWhatsAppPress,
}: PropertyExploreCardProps) {
  const amenities = (property.amenities || []).map((a) => a.toLowerCase());
  const hasBorehole = amenities.some((a) => a.includes('borehole') || a.includes('tank'));
  const hasSolar = amenities.some((a) => a.includes('solar') || a.includes('inverter') || a.includes('generator'));
  const hasDurawall = amenities.some((a) => a.includes('durawall') || a.includes('gate') || a.includes('security'));
  const hasWifi = amenities.some((a) => a.includes('wifi') || a.includes('fibre') || a.includes('internet'));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(property.id)}
      activeOpacity={0.88}
    >
      <PropertyThumbnail uri={property.images[0]} />
      <View style={styles.cardBody}>
        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>
            ${property.price}
            <Text style={styles.perMonth}>/mo</Text>
          </Text>
          {property.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{property.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {property.title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={13} color={Brand.terracotta} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationMain} numberOfLines={1}>
              {property.suburb}, {property.city}
            </Text>
            <Text style={styles.locationProvince}>{property.province}</Text>
          </View>
        </View>

        <View style={styles.specsRow}>
          <View style={styles.spec}>
            <Ionicons name="bed-outline" size={12} color={Brand.gray500} />
            <Text style={styles.specText}>{property.bedrooms} bed</Text>
          </View>
          <View style={styles.specDot} />
          <View style={styles.spec}>
            <Ionicons name="water-outline" size={12} color={Brand.gray500} />
            <Text style={styles.specText}>{property.bathrooms} bath</Text>
          </View>
          <View style={styles.specDot} />
          <View style={styles.spec}>
            <Ionicons name="people-outline" size={12} color={Brand.gray500} />
            <Text style={styles.specText}>{property.maxOccupants} max</Text>
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
            {property.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#2563EB" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>

          {property.landlord?.phone && onWhatsAppPress ? (
            <TouchableOpacity
              style={styles.cardWhatsAppButton}
              onPress={() => onWhatsAppPress(property)}
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
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.gray100,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardPrice: { fontSize: 17, fontWeight: '900', color: Brand.terracotta },
  perMonth: { fontSize: 11, fontWeight: '500', color: Brand.gray400 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
  availBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availBadgeText: { color: '#16A34A', fontSize: 10, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedBadgeText: { color: '#2563EB', fontSize: 10, fontWeight: '700' },
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
  cardUtilityWater: { backgroundColor: '#E0F2FE' },
  cardUtilitySolar: { backgroundColor: '#FEF3C7' },
  cardUtilitySecurity: { backgroundColor: '#D1FAE5' },
  cardUtilityWifi: { backgroundColor: '#EEF2FF' },
  cardUtilityText: { fontSize: 9, fontWeight: '700' },
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
