import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import {
  fetchReviews,
  fetchPropertyById,
  insertReport,
  insertReview,
  updateReview,
  type Review,
} from '../lib/database';
import type { Property } from '../types';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useAuth } from '../context/AuthContext';
import { useProperties } from '../context/PropertyContext';
import { useSaved } from '../context/SavedContext';
import { useRole } from '../context/AppContext';
import { usePropertyContact } from '../hooks/usePropertyContact';
import { Routes, RouteHelpers } from '../constants/routes';
import { EmptyState } from '../components/common/EmptyState';
import { ReportDialog } from '../components/common/ReportDialog';
import { ListingTrustCheckCard } from '../components/property/ListingTrustCheckCard';
import { ReviewSection } from '../components/property/ReviewSection';
import { PropertyUtilitiesCard } from '../components/property/PropertyUtilitiesCard';
import { PropertyContactBar } from '../components/property/PropertyContactBar';
import { VerifiedInfoModal } from '../components/property/VerifiedInfoModal';
import { PropertyHeroCarousel } from '../components/property/PropertyHeroCarousel';
import { PropertySpecsCard } from '../components/property/PropertySpecsCard';
import { PropertyAmenitiesGrid } from '../components/property/PropertyAmenitiesGrid';
import { PropertyLandlordSection } from '../components/property/PropertyLandlordSection';
import { PropertySafetyAdvisory } from '../components/property/PropertySafetyAdvisory';
import { useResponsive } from '../hooks/useResponsive';
import { WebHeader } from '../components/navigation/WebHeader';
import { WebFooter } from '../components/navigation/WebFooter';

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { properties } = useProperties();
  const { isSaved } = useSaved();
  const { userName } = useRole();
  const { user, isSupabaseEnabled } = useAuth();
  const requireAuth = useRequireAuth();
  const { width, isMobile } = useResponsive();
  const imageWidth = !isMobile ? Math.min(width - 48, 1180) : width;
  const imageHeight = !isMobile ? 480 : Math.min(width * 0.75, 420);

  // usePropertyContact must be called unconditionally (Rules of Hooks).
  const foundProperty = properties.find((p) => p.id === id) ?? (id ? undefined : properties[0]);
  const [fetchedProperty, setFetchedProperty] = useState<Property | null>(null);
  const [fetchFinished, setFetchFinished] = useState(false);

  useEffect(() => {
    if (foundProperty || !id) return;
    let isMounted = true;
    fetchPropertyById(id)
      .then((data) => {
        if (isMounted) {
          setFetchedProperty(data);
          setFetchFinished(true);
        }
      })
      .catch((err) => {
        console.error('[PropertyDetails] fetchPropertyById error:', err);
        if (isMounted) setFetchFinished(true);
      });
    return () => {
      isMounted = false;
    };
  }, [foundProperty, id]);

  const property = foundProperty ?? fetchedProperty ?? undefined;
  const isResolvingProperty = !foundProperty && Boolean(id) && !fetchFinished;

  // All contact/action handlers
  const {
    chatStarting,
    handleShare,
    handleMessage,
    handleCallLandlord,
    handleWhatsAppLandlord,
    handleGetDirections,
    handleBookViewing,
    handleToggleSaved,
  } = usePropertyContact(property ?? ({} as Property));
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [verifiedModalVisible, setVerifiedModalVisible] = useState(false);

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

  const ownReview = reviews.find((review) => review.authorId === user?.id);
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
    if (!property) return;
    if (!requireAuth(RouteHelpers.propertyDetails(property.id))) return;
    const text = reviewText.trim();
    if (!text) {
      Alert.alert('Review required', 'Please add a short comment with your rating.');
      return;
    }
    const authorId = user?.id;
    if (!authorId) return;
    const authorDisplayName =
      userName || (user?.user_metadata?.full_name as string) || 'Verified Tenant';
    setReviewSubmitting(true);
    try {
      if (ownReview) {
        await updateReview(property.id, authorId, displayedReviewRating, text);
      } else {
        await insertReview(property.id, authorId, authorDisplayName, displayedReviewRating, text);
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

  if (isResolvingProperty) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.terracotta} />
      </SafeAreaView>
    );
  }

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
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <EmptyState
            icon="home-outline"
            title="Property not found"
            message="This property may have been removed or the link is invalid."
            actionTitle="Browse Properties"
            onAction={() => router.replace(Routes.explore)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const saved = isSaved(property.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      {!isMobile && <WebHeader />}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !isMobile && styles.scrollContentDesktop]}
      >
        <View style={[styles.mainWrapper, !isMobile && styles.mainWrapperDesktop]}>
          {/* Top Image Hero Carousel */}
          <PropertyHeroCarousel
            images={property.images}
            propertyTitle={property.title}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            isDesktop={!isMobile}
            saved={saved}
            imgIndex={imgIndex}
            onIndexChange={setImgIndex}
            onBack={() => router.back()}
            onShare={handleShare}
            onToggleSaved={handleToggleSaved}
          />

          {/* Content Details */}
          <View style={styles.detailsContent}>
            {(property.verified || property.landlord?.verified) && (
              <View style={styles.availTagRow}>
                <TouchableOpacity
                  style={styles.verifiedDetailBadge}
                  onPress={() => setVerifiedModalVisible(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Verified property - tap to learn what this means"
                >
                  <Ionicons name="checkmark-circle" size={15} color="#0F4C81" />
                  <Text style={styles.verifiedDetailBadgeText}>Verified Listing</Text>
                  <Ionicons name="information-circle-outline" size={13} color="#0F4C81" />
                </TouchableOpacity>
              </View>
            )}

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
            <PropertySpecsCard
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              maxOccupants={property.maxOccupants}
            />

            {/* Key Utilities & Backup Infrastructure Highlights */}
            <Text style={styles.sectionHeader}>Utilities & Infrastructure</Text>
            <PropertyUtilitiesCard amenities={property.amenities || []} />

            {/* Amenities Grid */}
            <Text style={styles.sectionHeader}>Amenities</Text>
            <PropertyAmenitiesGrid amenities={property.amenities || []} />

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

            {/* Landlord Section */}
            <PropertyLandlordSection
              landlord={property.landlord}
              propertyRating={property.rating}
              onCall={handleCallLandlord}
              onWhatsApp={handleWhatsAppLandlord}
              onMessage={handleMessage}
            />

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
            <PropertySafetyAdvisory />
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
      <VerifiedInfoModal
        visible={verifiedModalVisible}
        onClose={() => setVerifiedModalVisible(false)}
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
  detailsContent: {
    padding: 20,
  },
  availTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  verifiedDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 76, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(15, 76, 129, 0.25)',
  },
  verifiedDetailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F4C81',
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
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: Brand.gray600,
    lineHeight: 22,
    marginBottom: 24,
  },
  reportListing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 12,
  },
  reportListingText: { color: Brand.error, fontSize: 13, fontWeight: '600' },
});
