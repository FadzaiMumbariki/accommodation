import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { PropertyGalleryItem } from './PropertyGalleryItem';

interface PropertyHeroCarouselProps {
  images: string[];
  propertyTitle: string;
  imageWidth: number;
  imageHeight: number;
  isDesktop?: boolean;
  saved: boolean;
  imgIndex: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  onShare: () => void;
  onToggleSaved: () => void;
}

export const PropertyHeroCarousel: React.FC<PropertyHeroCarouselProps> = ({
  images,
  propertyTitle,
  imageWidth,
  imageHeight,
  isDesktop = false,
  saved,
  imgIndex,
  onIndexChange,
  onBack,
  onShare,
  onToggleSaved,
}) => {
  const displayImages =
    images.length > 0
      ? images
      : [
          'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
        ];

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
      onIndexChange(Math.max(0, Math.min(nextIndex, displayImages.length - 1)));
    },
    [imageWidth, onIndexChange, displayImages.length],
  );

  return (
    <View
      style={[
        styles.imageContainer,
        { width: imageWidth, height: imageHeight },
        isDesktop && styles.imageContainerDesktop,
      ]}
    >
      <FlatList
        data={displayImages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item }) => (
          <PropertyGalleryItem
            item={item}
            width={imageWidth}
            height={imageHeight}
            accessibilityLabel={`${propertyTitle} photo`}
          />
        )}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
      />

      {/* Top Navigation Overlay */}
      <View style={styles.topNavOverlay}>
        <TouchableOpacity
          style={styles.navCircleBtn}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={Brand.white} />
        </TouchableOpacity>

        <View style={styles.topNavRight}>
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={onShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Share ${propertyTitle}`}
          >
            <Ionicons name="share-outline" size={20} color={Brand.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navCircleBtn}
            onPress={onToggleSaved}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              saved ? `Remove ${propertyTitle} from saved listings` : `Save ${propertyTitle}`
            }
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
            {imgIndex + 1}/{displayImages.length}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    backgroundColor: Brand.navy,
    position: 'relative',
    overflow: 'hidden',
  },
  imageContainerDesktop: {
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 20,
  },
  topNavOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topNavRight: {
    flexDirection: 'row',
    gap: 12,
  },
  navCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27, 42, 65, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBottomBadges: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availPillOnImage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 42, 65, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Brand.success,
  },
  availPillText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '600',
  },
  imageCounter: {
    backgroundColor: 'rgba(27, 42, 65, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  imageCounterText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
