import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Brand } from '../constants/Colors';
import {
  fetchReviews,
  insertReport,
  insertReview,
  updateReview,
  type Review,
} from '../lib/database';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useAuth } from '../context/AuthContext';
import { ReportDialog } from '../components/common/ReportDialog';
import { ListingTrustCheckCard } from '../components/property/ListingTrustCheckCard';
import { ReviewSection } from '../components/property/ReviewSection';
import { PropertyUtilitiesCard } from '../components/property/PropertyUtilitiesCard';
import { PropertyContactBar } from '../components/property/PropertyContactBar';
import { useResponsive } from '../hooks/useResponsive';
import { WebHeader } from '../components/navigation/WebHeader';
import { WebFooter } from '../components/navigation/WebFooter';

const { width: W } = Dimensions.get('window');

const AMENITY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  electricity: 'flash-outline',
  solar: 'sunny-outline',
  security: 'shield-checkmark-outline',
  parking: 'car-outline',
  garden: 'leaf-outline',
  borehole: 'water-outline',
  wifi: 'wifi-outline',
  furnished: 'bed-outline',
  aircon: 'snow-outline',
  generator: 'power-outline',
  dstv: 'tv-outline',
  kitchen: 'restaurant-outline',
  transport: 'bus-outline',
  pets: 'paw-outline',
  laundry: 'shirt-outline',
  fireplace: 'flame-outline',
  wall: 'business-outline',
  durawall: 'business-outline',
};

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    properties,
    isSaved,
    toggleSaved,
    startConversation,
    openConversation,
    setSelectedConversationId,
    userName,
  } = useApp();
  const { user, isSupabaseEnabled } = useAuth();
  const requireAuth = useRequireAuth();
  const [chatStarting, setChatStarting] = useState(false);
  const { width, isMobile } = useResponsive();
  const imageWidth = !isMobile ? Math.min(width - 48, 1180) : width;
  const imageHeight = !isMobile ? 480 : Math.min(width * 0.75, 420);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const property = properties.find((p) => p.id === id) ?? (id ? undefined : properties[0]);
  const [imgIndex, setImgIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(Boolean(property));

  // Load reviews from Supabase
  useEffect(() => {
    if (!property?.id) return;
    let isMounted = true;
    fetchReviews(property.id)
      .then((data) => {
        if (isMounted) {
          setReviews(data);
          setReviewsError(null);
          setReviewsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReviewsError('Could not load reviews. Please retry.');
          setReviewsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [property]);

  const ownReview = reviews.find(review => review.authorId === user?.id);
  const displayedReviewRating = reviewRating ?? ownReview?.rating ?? 5;

  const retryReviews = async () => {
    if (!property) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      setReviews(await fetchReviews(property.id));
    } catch (error) {
      console.error('[PropertyDetails] Could not reload reviews:', error);
      setReviewsError('Could not load reviews. Please retry.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const submitReview = async () => {
    if (!property || !requireAuth(`/property-details?id=${property.id}`)) return;
    if (!user || !isSupabaseEnabled) {
      Alert.alert('Reviews unavailable', 'Sign in to a connected ImbaFind account to leave a review.');
      return;
    }
    const text = reviewText.trim();
    if (!text) {
      Alert.alert('Review required', 'Please add a short comment with your rating.');
      return;
    }
    setReviewSubmitting(true);
    try {
      if (ownReview) {
        await updateReview(property.id, user.id, displayedReviewRating, text);
      } else {
        await insertReview(property.id, user.id, userName, displayedReviewRating, text);
      }
      const refreshed = await fetchReviews(property.id);
      setReviews(refreshed);
      setReviewsError(null);
      setReviewText('');
      setReviewRating(null);
      Alert.alert('Review saved', 'Thank you for sharing your feedback.');
    } catch (error) {
      console.error('[PropertyDetails] Could not save review:', error);
      Alert.alert(
        'Could not save review',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitListingReport = async (reason: string, details: string): Promise<boolean> => {
    if (!user || !property) return false;
    setReportSubmitting(true);
    try {
      await insertReport({
        reporterId: user.id,
        propertyId: property.id,
        reason,
        details,
      });
      setReportVisible(false);
      Alert.alert('Report submitted', 'Thank you. Our team will review this listing.');
      return true;
    } catch (error) {
      console.error('[PropertyDetails] Could not submit listing report:', error);
      Alert.alert(
        'Report not submitted',
        error instanceof Error ? error.message : 'Please try again.',
      );
      return false;
    } finally {
      setReportSubmitting(false);
    }
  };

  if (!property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={{ padding: 16 }}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="home-outline" size={48} color={Brand.gray300} />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: Brand.navy }}>
            Property not found
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: Brand.gray500, textAlign: 'center' }}>
            This property may have been removed or the link is invalid.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: Brand.terracotta, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={() => router.replace('/(tabs)/explore')}
          >
            <Text style={{ color: Brand.white, fontWeight: '700', fontSize: 14 }}>Browse Properties</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const saved = isSaved(property.id);

  const handleShare = async () => {
    const url = `https://imbafind.co.zw/property/${property.id}`;
    const message = `${property.title} - $${property.price}/month in ${property.suburb}, ${property.city}`;
    try {
      await Share.share({
        message: `${message}\n${url}`,
        url,
        title: `Share ${property.title}`,
      });
    } catch {
      try {
        await Clipboard.setStringAsync(`${message}\n${url}`);
        Alert.alert('Copied', 'Property link copied to clipboard!');
      } catch {
        Alert.alert('Copied', 'Property link copied to clipboard!');
      }
    }
  };

  const handleMessage = async () => {
    if (!requireAuth(`/property-details?id=${property.id}`)) return;
    if (chatStarting) return;
    setChatStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const convId = await startConversation(property);
      setSelectedConversationId(convId);
      await openConversation(convId);
      router.push('/chat');
    } catch (error) {
      console.error('[PropertyDetails] Could not start conversation:', error);
      Alert.alert(
        'Could not start chat',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setChatStarting(false);
    }
  };

  const handleCallLandlord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = property.landlord?.phone;
    if (!phone) {
      Alert.alert('Phone number unavailable', 'Use the in-app message option to contact the landlord.');
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    void Linking.openURL(`tel:${cleanPhone}`).catch(error => {
      console.error('[PropertyDetails] Could not open phone link:', error);
      Alert.alert('Could not place call', 'Please try again.');
    });
  };

  const handleGetDirections = async () => {
    const destination = property.coordinates
      ? `${property.coordinates.lat},${property.coordinates.lng}`
      : [property.address, property.suburb, property.city, property.province]
          .filter(Boolean)
          .join(', ');
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
    const nativeMapsUrl = Platform.OS === 'ios'
      ? `maps://?daddr=${encodedDestination}&dirflg=d`
      : Platform.OS === 'android'
        ? `google.navigation:q=${encodedDestination}&mode=d`
        : googleMapsUrl;

    try {
      await Linking.openURL(nativeMapsUrl);
    } catch {
      if (nativeMapsUrl === googleMapsUrl) {
        Alert.alert('Maps Error', 'Could not open directions for this property.');
        return;
      }
      try {
        await Linking.openURL(googleMapsUrl);
      } catch {
        Alert.alert('Maps Error', 'Could not open directions for this property.');
      }
    }
  };

  const handleWhatsAppLandlord = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rawPhone = property.landlord?.phone;
    if (!rawPhone) {
      Alert.alert('Phone number unavailable', 'Use the in-app message option to contact the landlord.');
      return;
    }
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '263' + cleanPhone.slice(1);
    }
    const defaultMsg = encodeURIComponent(
      `Hi ${property.landlord?.name || 'there'}, I saw your listing for "${property.title}" in ${property.suburb}, ${property.city} ($${property.price}/month) on ImbaFind. Is it still available?`
    );
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${defaultMsg}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    }
  };

  const handleBookViewing = () => {
    if (!requireAuth(`/property-details?id=${property.id}`)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/book-viewing?id=${property.id}`);
  };

  const handleToggleSaved = () => {
    if (!requireAuth(`/property-details?id=${property.id}`)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void toggleSaved(property.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {!isMobile && <WebHeader />}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
      >
        <View style={[styles.mainWrapper, !isMobile && styles.mainWrapperDesktop]}>
          {/* Top Image Hero */}
          <View
            style={[
              styles.imageContainer,
              { width: imageWidth, height: imageHeight },
              !isMobile && styles.imageContainerDesktop,
            ]}
          >
            <FlatList
              data={property.images}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setImgIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth))
              }
              renderItem={({ item }) => (
                <View style={[styles.carouselSlide, { width: imageWidth, height: imageHeight }]}>
                  <Image
                    source={{ uri: item }}
                    style={[styles.carouselImage, { width: imageWidth, height: imageHeight }]}
                    contentFit="cover"
                    transition={250}
                    cachePolicy="memory-disk"
                  />
                </View>
              )}
            />

          {/* Top Navigation Overlay */}
          <View style={styles.topNavOverlay}>
            <TouchableOpacity
              style={styles.navCircleBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={Brand.white} />
            </TouchableOpacity>

            <View style={styles.topNavRight}>
              <TouchableOpacity
                style={styles.navCircleBtn}
                onPress={handleShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Share ${property.title}`}
              >
                <Ionicons name="share-outline" size={20} color={Brand.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navCircleBtn}
                onPress={handleToggleSaved}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={saved ? `Remove ${property.title} from saved listings` : `Save ${property.title}`}
              >
                <Ionicons
                  name={saved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={saved ? '#E5534B' : Brand.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Badges on Image */}
          <View style={styles.imageBottomBadges}>
            <View style={styles.availPillOnImage}>
              <View style={styles.availDot} />
              <Text style={styles.availPillText}>Available now</Text>
            </View>
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {imgIndex + 1}/{property.images.length || 1}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Details */}
        <View style={styles.detailsContent}>
          <View style={styles.availTagRow}>
            <View style={styles.availDotSmall} />
            <Text style={styles.availTagText}>Available now</Text>
          </View>

          <Text style={styles.propertyTitle}>{property.title}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={15} color={Brand.terracotta} />
            <Text style={styles.locationText} numberOfLines={2}>
              {property.suburb}, {property.city}
            </Text>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={handleGetDirections}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Get directions to ${property.title}`}
            >
              <Ionicons name="navigate-outline" size={15} color={Brand.terracotta} />
              <Text style={styles.directionsButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.priceText}>
            ${property.price}
            <Text style={styles.pricePeriod}>/month</Text>
          </Text>

          {/* Specs Row */}
          <View style={styles.specsCard}>
            <View style={styles.specBox}>
              <Ionicons name="bed-outline" size={20} color={Brand.navy} />
              <Text style={styles.specValue}>{property.bedrooms}</Text>
              <Text style={styles.specTitle}>Bedrooms</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specBox}>
              <Ionicons name="water-outline" size={20} color={Brand.navy} />
              <Text style={styles.specValue}>{property.bathrooms}</Text>
              <Text style={styles.specTitle}>Bathroom</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specBox}>
              <Ionicons name="people-outline" size={20} color={Brand.navy} />
              <Text style={styles.specValue}>{property.maxOccupants}</Text>
              <Text style={styles.specTitle}>People</Text>
            </View>
          </View>

          {/* Key Utilities & Backup Infrastructure Highlights */}
          <Text style={styles.sectionHeader}>Utilities & Infrastructure</Text>
          <PropertyUtilitiesCard amenities={property.amenities || []} />

          {/* Amenities Grid */}
          <Text style={styles.sectionHeader}>Amenities</Text>
          {property.amenities && property.amenities.length > 0 ? (
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((a) => {
                const iconName = AMENITY_ICON_MAP[a.toLowerCase()] || 'checkmark-circle';
                const label = a.charAt(0).toUpperCase() + a.slice(1);
                return (
                  <View key={a} style={styles.amenityCard}>
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={Brand.terracotta}
                    />
                    <Text style={styles.amenityLabel} numberOfLines={2}>{label}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noAmenitiesText}>No amenities listed.</Text>
          )}

          {/* Description Section */}
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{property.description}</Text>

          {/* AI Listing Trust Check (Scam Warning & Verification Signals) */}
          <ListingTrustCheckCard
            property={property}
            allProperties={properties}
            onReportPress={() => {
              if (!requireAuth(`/property-details?id=${property.id}`)) return;
              setReportVisible(true);
            }}
          />

          {/* Reviews Section */}
          <ReviewSection
            reviews={reviews}
            loading={reviewsLoading}
            error={reviewsError}
            reviewsCount={property.reviewsCount}
            isSupabaseEnabled={isSupabaseEnabled}
            displayedReviewRating={displayedReviewRating}
            reviewText={reviewText}
            reviewSubmitting={reviewSubmitting}
            ownReview={ownReview}
            onRetry={() => void retryReviews()}
            onRatingSelect={setReviewRating}
            onReviewTextChange={setReviewText}
            onSubmitReview={() => void submitReview()}
          />

          {/* Landlord Card */}
          <Text style={styles.sectionHeader}>Landlord</Text>
          <View style={styles.landlordCard}>
            {property.landlord?.avatar ? (
              <Image
                source={{ uri: property.landlord.avatar }}
                style={styles.landlordAvatar}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.landlordAvatar, styles.landlordAvatarPlaceholder]}>
                <Text style={styles.landlordAvatarInitial}>
                  {property.landlord?.name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View style={styles.landlordDetails}>
              <View style={styles.landlordNameRow}>
                <Text style={styles.landlordName}>{property.landlord?.name || 'Landlord'}</Text>
                {property.landlord?.verified && (
                  <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
                )}
              </View>
              {(property.landlord?.rating ?? property.rating) != null && (
                <Text style={styles.landlordMeta}>
                  Rating: {property.landlord?.rating ?? property.rating} / 5
                </Text>
              )}
            </View>
          </View>

          {isSupabaseEnabled && (
            <TouchableOpacity
              style={styles.reportListing}
              onPress={() => {
                if (!requireAuth(`/property-details?id=${property.id}`)) return;
                setReportVisible(true);
              }}
              accessibilityLabel="Report this listing"
            >
              <Ionicons name="flag-outline" size={17} color={Brand.error} />
              <Text style={styles.reportListingText}>Report listing</Text>
            </TouchableOpacity>
          )}

          {/* Tenant Safety & Anti-Scam Alert */}
          <View style={styles.safetyAlertCard}>
            <View style={styles.safetyIconBox}>
              <Ionicons name="shield-half" size={20} color="#D97706" />
            </View>
            <View style={styles.safetyAlertContent}>
              <Text style={styles.safetyAlertTitle}>Safety & Fraud Advisory</Text>
              <Text style={styles.safetyAlertText}>
                Never send rental deposits or viewing fees via EcoCash, Innbucks or bank transfer before physically inspecting this property with the landlord.
              </Text>
            </View>
          </View>

          {/* Landlord Contact Buttons */}
          <View style={styles.landlordActions}>
            <TouchableOpacity
              style={[styles.landlordActionBtn, styles.landlordActionBtnSecondary]}
              onPress={handleCallLandlord}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color={Brand.terracotta} />
              <Text style={[styles.landlordActionBtnText, { color: Brand.terracotta }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.landlordActionBtn, styles.landlordActionBtnWhatsApp]}
              onPress={handleWhatsAppLandlord}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color={Brand.white} />
              <Text style={[styles.landlordActionBtnText, { color: Brand.white }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.landlordActionBtn, styles.landlordActionBtnPrimary]}
              onPress={handleMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Brand.white} />
              <Text style={[styles.landlordActionBtnText, { color: Brand.white }]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
        {!isMobile && <WebFooter />}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <PropertyContactBar
        saved={saved}
        propertyTitle={property.title}
        chatStarting={chatStarting}
        onWhatsApp={handleWhatsAppLandlord}
        onMessage={handleMessage}
        onBookViewing={handleBookViewing}
        onToggleSaved={handleToggleSaved}
      />
      <ReportDialog
        visible={reportVisible}
        title="Report listing"
        targetLabel={property.title}
        submitting={reportSubmitting}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitListingReport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  scrollContent: { paddingBottom: 110 },
  scrollContentDesktop: { paddingBottom: 100 },
  mainWrapper: { width: '100%' },
  mainWrapperDesktop: {
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  imageContainer: {
    width: W,
    height: W * 0.75,
    position: 'relative',
    backgroundColor: Brand.navy,
  },
  imageContainerDesktop: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  carouselSlide: {
    width: W,
    height: W * 0.75,
    backgroundColor: Brand.navy,
  },
  carouselImage: {
    width: W,
    height: W * 0.75,
  },
  topNavOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topNavRight: {
    flexDirection: 'row',
    gap: 10,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBottomBadges: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availPillOnImage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.white,
  },
  availPillText: {
    color: Brand.white,
    fontSize: 11,
    fontWeight: '700',
  },
  imageCounter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContent: {
    padding: 20,
  },
  availTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  availDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.success,
  },
  availTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.success,
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Brand.navy,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: Brand.gray500,
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  directionsButtonText: {
    color: Brand.terracotta,
    fontSize: 12,
    fontWeight: '700',
  },
  priceText: {
    fontSize: 26,
    fontWeight: '900',
    color: Brand.terracotta,
    marginBottom: 18,
  },
  pricePeriod: {
    fontSize: 14,
    color: Brand.gray500,
    fontWeight: '500',
  },
  specsCard: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  specBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.navy,
    marginTop: 2,
  },
  specTitle: {
    fontSize: 11,
    color: Brand.gray400,
    fontWeight: '500',
  },
  specDivider: {
    width: 1,
    backgroundColor: Brand.gray200,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  amenityCard: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: Brand.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: Brand.gray200,
    gap: 6,
  },
  amenityLabel: {
    fontSize: 11,
    color: Brand.navy,
    fontWeight: '600',
    textAlign: 'center',
  },
  noAmenitiesText: {
    fontSize: 13,
    color: Brand.gray400,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: Brand.gray600,
    lineHeight: 22,
    marginBottom: 24,
  },
  landlordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginBottom: 12,
  },
  landlordAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  landlordAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.gray200,
  },
  landlordAvatarInitial: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  reportListing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 12,
  },
  reportListingText: { color: Brand.error, fontSize: 13, fontWeight: '600' },
  landlordDetails: {
    flex: 1,
  },
  landlordNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  landlordName: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
  },
  landlordMeta: {
    fontSize: 12,
    color: Brand.gray500,
  },
  landlordActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  landlordActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  landlordActionBtnPrimary: {
    backgroundColor: Brand.terracotta,
  },
  landlordActionBtnSecondary: {
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.terracotta,
  },
  landlordActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  landlordActionBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  safetyAlertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  safetyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyAlertContent: {
    flex: 1,
  },
  safetyAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  safetyAlertText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#B45309',
  },
});
