/**
 * ReviewSection — extracted from property-details.tsx.
 * Renders the list of reviews, loading/error states, and the write-review form.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import type { Review } from '../../lib/database';

interface ReviewSectionProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  reviewsCount?: number;
  isSupabaseEnabled: boolean;
  /** Displayed rating — falls back to ownReview rating then 5 */
  displayedReviewRating: number;
  reviewText: string;
  reviewSubmitting: boolean;
  ownReview?: Review;
  onRetry: () => void;
  onRatingSelect: (star: number) => void;
  onReviewTextChange: (text: string) => void;
  onSubmitReview: () => void;
}

export function ReviewSection({
  reviews,
  loading,
  error,
  reviewsCount,
  isSupabaseEnabled,
  displayedReviewRating,
  reviewText,
  reviewSubmitting,
  ownReview,
  onRetry,
  onRatingSelect,
  onReviewTextChange,
  onSubmitReview,
}: ReviewSectionProps) {
  return (
    <>
      <Text style={styles.sectionHeader}>
        Reviews {reviewsCount ? `(${reviewsCount})` : ''}
      </Text>

      {loading ? (
        <View style={styles.emptyReviews}>
          <ActivityIndicator color={Brand.terracotta} />
        </View>
      ) : error ? (
        <View style={styles.emptyReviews}>
          <Text style={styles.emptyReviewsText}>{error}</Text>
          <TouchableOpacity onPress={onRetry} style={styles.reviewRetry}>
            <Text style={styles.reviewRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.length > 0 ? (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          scrollEnabled={false}
          renderItem={({ item: r }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{r.authorName}</Text>
                <Text style={styles.reviewRating}>Rating: {r.rating} / 5</Text>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={Brand.gray300} />
          <Text style={styles.emptyReviewsText}>Be the first to review this property!</Text>
        </View>
      )}

      {isSupabaseEnabled && (
        <View style={styles.reviewForm}>
          <Text style={styles.reviewFormTitle}>
            {ownReview ? 'Edit your review' : 'Leave a review'}
          </Text>
          <View style={styles.ratingPicker}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onRatingSelect(star)}
                accessibilityLabel={`Rate ${star} out of 5 stars`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.reviewRatingChoice,
                    star <= displayedReviewRating && styles.reviewRatingChoiceSelected,
                  ]}
                >
                  {star}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {ownReview && (
            <Text style={styles.existingReviewText}>Current review: {ownReview.text}</Text>
          )}
          <TextInput
            style={styles.reviewInput}
            placeholder={ownReview ? 'Update your comment' : 'Share your experience'}
            placeholderTextColor={Brand.gray400}
            value={reviewText}
            onChangeText={onReviewTextChange}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            accessibilityLabel="Review comment"
          />
          <TouchableOpacity
            style={[styles.reviewSubmit, reviewSubmitting && styles.reviewSubmitDisabled]}
            onPress={onSubmitReview}
            disabled={reviewSubmitting}
          >
            {reviewSubmitting ? (
              <ActivityIndicator color={Brand.white} size="small" />
            ) : (
              <Text style={styles.reviewSubmitText}>
                {ownReview ? 'Update review' : 'Submit review'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 12,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    marginBottom: 24,
    backgroundColor: Brand.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    gap: 8,
  },
  emptyReviewsText: {
    fontSize: 13,
    color: Brand.gray500,
    fontWeight: '600',
    textAlign: 'center',
  },
  reviewRetry: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Brand.terracotta,
  },
  reviewRetryText: { color: Brand.white, fontSize: 12, fontWeight: '700' },
  reviewCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: Brand.navy },
  reviewRating: { fontSize: 12, fontWeight: '600' },
  reviewText: { fontSize: 13, color: Brand.gray600, lineHeight: 19 },
  reviewForm: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    padding: 14,
    marginBottom: 24,
  },
  reviewFormTitle: { color: Brand.navy, fontSize: 15, fontWeight: '700' },
  ratingPicker: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  reviewRatingChoice: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.gray300,
    color: Brand.navy,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewRatingChoiceSelected: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
    color: Brand.white,
  },
  existingReviewText: { color: Brand.gray500, fontSize: 12, marginBottom: 8 },
  reviewInput: {
    minHeight: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
    padding: 12,
    color: Brand.navy,
    fontSize: 14,
  },
  reviewSubmit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Brand.terracotta,
    marginTop: 10,
  },
  reviewSubmitDisabled: { opacity: 0.6 },
  reviewSubmitText: { color: Brand.white, fontSize: 14, fontWeight: '700' },
});
