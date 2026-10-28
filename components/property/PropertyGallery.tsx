import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Brand } from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface PropertyGalleryProps {
  images: string[];
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const displayImages =
    images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems && viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.slide}>
        <Image
          source={{ uri: item }}
          style={styles.image}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((_: string, index: number) => String(index), []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayImages}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
      />

      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {displayImages.length}
        </Text>
      </View>

      {displayImages.length > 1 && (
        <View style={styles.paginationDots}>
          {displayImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    position: 'relative',
    backgroundColor: Brand.navy,
  },
  slide: {
    width,
    height: 300,
    backgroundColor: Brand.navy,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counterBadge: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: 'rgba(27, 42, 65, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: Brand.terracotta,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
