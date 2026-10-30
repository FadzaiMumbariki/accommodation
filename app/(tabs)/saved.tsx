import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { Brand } from '../../constants/Colors';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { PropertyCard } from '../../components/property/PropertyCard';
import { WebFooter } from '../../components/navigation/WebFooter';

export default function SavedScreen() {
  const { properties, savedPropertyIds, toggleSaved } = useApp();
  const requireAuth = useRequireAuth();
  const { isMobile, numColumns } = useResponsive();

  const savedProperties = properties.filter((p) => savedPropertyIds.includes(p.id));

  const openProperty = (id: string) => {
    router.push(`/property-details?id=${id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, !isMobile && styles.headerDesktop]}>
        <Text style={styles.screenTitle}>Saved Properties</Text>
        <Text style={styles.screenSub}>
          {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'} saved
        </Text>
      </View>

      <FlatList
        key={`saved-grid-${numColumns}`}
        data={savedProperties}
        keyExtractor={(p) => p.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.desktopColumnWrapper : undefined}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listContent, !isMobile && styles.listContentDesktop]}
        ItemSeparatorComponent={numColumns === 1 ? () => <View style={{ height: 12 }} /> : undefined}
        renderItem={({ item }) => {
          if (numColumns > 1) {
            return (
              <View style={styles.gridItemWrapper}>
                <PropertyCard
                  property={item}
                  onPress={() => openProperty(item.id)}
                />
              </View>
            );
          }
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openProperty(item.id)}
              activeOpacity={0.88}
            >
              <Image
                source={{ uri: item.images[0] }}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <View style={styles.cardDetails}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!requireAuth(`/property-details?id=${item.id}`)) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleSaved(item.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from saved"
                  >
                    <Ionicons name="heart" size={20} color={Brand.terracotta} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardLocation} numberOfLines={1}>
                  {item.suburb ? `${item.suburb}, ${item.city}` : item.city}
                </Text>

                <Text style={styles.cardPrice}>
                  ${item.price}
                  <Text style={styles.perMonth}>/mo</Text>
                </Text>

                <View style={styles.cardSpecs}>
                  <View style={styles.spec}>
                    <Ionicons name="bed-outline" size={13} color={Brand.gray500} />
                    <Text style={styles.specText}>{item.bedrooms}</Text>
                  </View>
                  <View style={styles.spec}>
                    <Ionicons name="water-outline" size={13} color={Brand.gray500} />
                    <Text style={styles.specText}>{item.bathrooms}</Text>
                  </View>
                  <View style={styles.spec}>
                    <Ionicons name="people-outline" size={13} color={Brand.gray500} />
                    <Text style={styles.specText}>{item.maxOccupants}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            <View style={styles.footerPrompt}>
              <View style={styles.heartIconWrap}>
                <Ionicons name="heart-outline" size={24} color={Brand.terracotta} />
              </View>
              <Text style={styles.footerTitle}>
                {savedProperties.length === 0
                  ? "You haven't saved any properties yet."
                  : 'Looking for more options?'}
              </Text>
              <Text style={styles.footerSubtitle}>
                Save properties you like and find them here anytime on mobile or desktop.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/explore')}
                activeOpacity={0.85}
              >
                <Text style={styles.exploreBtnText}>Explore accommodation</Text>
              </TouchableOpacity>
            </View>
            {!isMobile && <WebFooter />}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  headerDesktop: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.navy,
  },
  screenSub: {
    fontSize: 13,
    color: Brand.gray500,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentDesktop: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  desktopColumnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  gridItemWrapper: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: Brand.gray100,
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
    flex: 1,
    marginRight: 8,
  },
  cardLocation: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.terracotta,
    marginTop: 4,
  },
  perMonth: {
    fontSize: 11,
    fontWeight: '400',
    color: Brand.gray400,
  },
  cardSpecs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 11,
    color: Brand.gray500,
  },
  footerPrompt: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  heartIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.terracotta + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 6,
    textAlign: 'center',
  },
  footerSubtitle: {
    fontSize: 13,
    color: Brand.gray500,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.white,
  },
});
