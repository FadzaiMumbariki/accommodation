import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Property } from '../../types';
import { Brand } from '../../constants/Colors';
import { AvailabilityBadge } from '../common/AvailabilityBadge';
import { useApp } from '../../context/AppContext';

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  style?: ViewStyle;
  horizontal?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  style,
  horizontal = false,
}) => {
  const { isPropertySaved, toggleSaveProperty } = useApp();
  const saved = isPropertySaved(property.id);

  const mainImage = property.images[0] || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80';
  const rating = property.rating ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        horizontal ? styles.cardHorizontal : styles.cardVertical,
        style,
      ]}
    >
      <View style={[styles.imageContainer, horizontal && styles.imageContainerHorizontal]}>
        <Image
          source={{ uri: mainImage }}
          style={styles.image}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />

        <View style={styles.topBadgeContainer}>
          <AvailabilityBadge
            status={property.availabilityStatus ?? (property.available ? 'available_now' : 'occupied')}
            availableFromDate={property.availableFromDate}
            size="small"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSaveProperty(property.id);
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${property.title} from saved listings` : `Save ${property.title}`}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={20}
            color={saved ? Brand.terracotta : Brand.navy}
          />
        </TouchableOpacity>

        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{property.propertyType}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.price}>{property.price}</Text>
            <Text style={styles.perMonth}> / month</Text>
          </View>
          {rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={14} color={Brand.terracotta} />
          <View style={styles.locationDetails}>
            <Text style={styles.locationMain} numberOfLines={1}>
              {property.suburb}, {property.city}
            </Text>
            <Text style={styles.locationProvince} numberOfLines={1}>
              {property.province}
            </Text>
          </View>
        </View>

        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Ionicons name="bed-outline" size={14} color={Brand.gray500} />
            <Text style={styles.specText}>
              {property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}
            </Text>
          </View>

          <View style={styles.specDivider} />

          <View style={styles.specItem}>
            <Ionicons name="water-outline" size={14} color={Brand.gray500} />
            <Text style={styles.specText}>
              {property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}
            </Text>
          </View>

          <View style={styles.specDivider} />

          <View style={styles.specItem}>
            <Ionicons name="people-outline" size={14} color={Brand.gray500} />
            <Text style={styles.specText}>
              Max {property.maxOccupants}
            </Text>
          </View>

          {property.verified && (
            <>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Ionicons name="shield-checkmark" size={14} color={Brand.success} />
                <Text style={[styles.specText, { color: Brand.success, fontWeight: '700' }]}>
                  Verified
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Utility Badges Row for Zimbabwean Rentals */}
        {!horizontal && (
          (() => {
            const amenitiesList = (property.amenities || []).map(a => a.toLowerCase());
            const hasBorehole = amenitiesList.some(a => a.includes('borehole') || a.includes('tank'));
            const hasWater = !hasBorehole && amenitiesList.some(a => a.includes('water'));
            const hasSolar = amenitiesList.some(a => a.includes('solar') || a.includes('inverter') || a.includes('generator'));
            const hasDurawall = amenitiesList.some(a =>
              a.includes('durawall') || a.includes('boundary wall') || a === 'wall'
            );
            const hasSecurity = amenitiesList.some(a => a.includes('security') || a.includes('gate'));
            const hasWifi = amenitiesList.some(a => a.includes('wifi') || a.includes('fibre') || a.includes('internet'));

            if (!hasBorehole && !hasWater && !hasSolar && !hasDurawall && !hasSecurity && !hasWifi) return null;

            return (
              <View style={styles.utilityRow}>
                {hasBorehole && (
                  <View style={[styles.utilityPill, styles.utilityWater]}>
                    <Ionicons name="water" size={11} color="#0284C7" />
                    <Text style={[styles.utilityText, { color: '#0369A1' }]}>Borehole</Text>
                  </View>
                )}
                {hasWater && (
                  <View style={[styles.utilityPill, styles.utilityWater]}>
                    <Ionicons name="water-outline" size={11} color="#0284C7" />
                    <Text style={[styles.utilityText, { color: '#0369A1' }]}>Water</Text>
                  </View>
                )}
                {hasSolar && (
                  <View style={[styles.utilityPill, styles.utilitySolar]}>
                    <Ionicons name="sunny" size={11} color="#D97706" />
                    <Text style={[styles.utilityText, { color: '#B45309' }]}>Solar Power</Text>
                  </View>
                )}
                {hasDurawall && (
                  <View style={[styles.utilityPill, styles.utilitySecurity]}>
                    <Ionicons name="business" size={11} color="#059669" />
                    <Text style={[styles.utilityText, { color: '#047857' }]}>Durawall</Text>
                  </View>
                )}
                {hasSecurity && (
                  <View style={[styles.utilityPill, styles.utilitySecurity]}>
                    <Ionicons name="shield-checkmark" size={11} color="#059669" />
                    <Text style={[styles.utilityText, { color: '#047857' }]}>Security</Text>
                  </View>
                )}
                {hasWifi && (
                  <View style={[styles.utilityPill, styles.utilityWifi]}>
                    <Ionicons name="wifi" size={11} color="#4F46E5" />
                    <Text style={[styles.utilityText, { color: '#4338CA' }]}>Wi-Fi</Text>
                  </View>
                )}
              </View>
            );
          })()
        )}

        {!horizontal && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>View details</Text>
              <Ionicons name="arrow-forward" size={13} color={Brand.terracotta} />
            </TouchableOpacity>

            {property.landlord?.phone ? (
              <TouchableOpacity
                style={styles.cardWhatsAppBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const rawPhone = property.landlord?.phone;
                  if (!rawPhone) return;
                  let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
                    cleanPhone = '263' + cleanPhone.slice(1);
                  }
                  const defaultMsg = encodeURIComponent(
                    `Hi ${property.landlord?.name || 'there'}, I saw your listing for "${property.title}" in ${property.suburb}, ${property.city} ($${property.price}/month) on ImbaFind. Is it still available?`
                  );
                  const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${defaultMsg}`;
                  const webUrl = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
                  Linking.canOpenURL(appUrl)
                    .then(can => Linking.openURL(can ? appUrl : webUrl))
                    .catch(() => Linking.openURL(webUrl));
                }}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Chat with landlord on WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={14} color={Brand.white} />
                <Text style={styles.cardWhatsAppText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.gray100,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardVertical: {
    width: '100%',
  },
  cardHorizontal: {
    width: 160,
    marginRight: 12,
    marginBottom: 8,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#EFEFEF',
  },
  imageContainerHorizontal: {
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  saveButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(27, 42, 65, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.terracotta,
    letterSpacing: -0.5,
  },
  perMonth: {
    fontSize: 11,
    color: Brand.gray500,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 4,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 4,
  },
  locationMain: {
    fontSize: 12,
    color: Brand.navy,
    fontWeight: '600',
    lineHeight: 16,
  },
  locationProvince: {
    fontSize: 11,
    color: Brand.gray400,
    fontWeight: '400',
    lineHeight: 15,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.gray100,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 11,
    color: Brand.navy,
    fontWeight: '600',
    marginLeft: 4,
  },
  specDivider: {
    width: 1,
    height: 14,
    backgroundColor: Brand.gray200,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  utilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  utilityWater: {
    backgroundColor: '#E0F2FE',
  },
  utilitySolar: {
    backgroundColor: '#FEF3C7',
  },
  utilitySecurity: {
    backgroundColor: '#D1FAE5',
  },
  utilityWifi: {
    backgroundColor: '#EDE9FE',
  },
  utilityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  cardWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  cardWhatsAppText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.white,
  },
});
