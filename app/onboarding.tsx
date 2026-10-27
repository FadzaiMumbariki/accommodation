import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Brand } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Find available accommodation',
    description: 'Search rooms, houses and apartments around Zimbabwe.',
    image:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Find a place that fits',
    description: 'Filter by location, price, bedrooms, people and amenities.',
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Connect with landlords',
    description: 'Chat with landlords and request property viewings.',
    image:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  },
];

export default function OnboardingScreen() {
  const [pageIdx, setPageIdx] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (pageIdx < 2) {
      flatListRef.current?.scrollToIndex({ index: pageIdx + 1, animated: true });
      setPageIdx(pageIdx + 1);
    } else {
      router.push('/choose-account');
    }
  };

  const handleSkip = () => {
    router.push('/choose-account');
  };

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setPageIdx(newIndex);
        }}
        keyExtractor={(item) => item.id}
        style={styles.carousel}
      />

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === pageIdx ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Bottom Actions Row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.actionBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>{pageIdx === 2 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
    justifyContent: 'space-between',
  },
  carousel: {
    flexGrow: 0,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.48,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Brand.navy,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    color: Brand.gray600,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Brand.terracotta,
    width: 24,
  },
  dotInactive: {
    backgroundColor: Brand.gray300,
    width: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Brand.gray500,
  },
  actionBtn: {
    backgroundColor: Brand.terracotta,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
