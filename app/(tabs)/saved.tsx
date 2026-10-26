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

export default function SavedScreen() {
  const { properties, savedPropertyIds, toggleSaved } = useApp();
  const requireAuth = useRequireAuth();
  const savedProperties = properties.filter((p) => savedPropertyIds.includes(p.id));

  const openProperty = (id: string) => {
    router.push(`/property-details?id=${id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Saved Properties</Text>
      </View>

      <FlatList
        data={savedProperties}
        keyExtractor={(p) => p.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
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
                  accessibilityLabel={`Remove ${item.title} from saved listings`}
                >
                  <Ionicons name="heart" size={20} color={Brand.terracotta} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardLocation} numberOfLines={1}>
                {item.suburb}, {item.city}
              </Text>
              <Text style={styles.cardPrice}>${item.price}/month</Text>

              <View style={styles.availPill}>
                <Text style={styles.availPillText}>Available now</Text>
              </View>

              <View style={styles.specsRow}>
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
        )}
        ListFooterComponent={
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
              Save properties you like and find them here later.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/(tabs)/explore')}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreBtnText}>Explore accommodation</Text>
            </TouchableOpacity>
          </View>
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.navy,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
    flex: 1,
    marginRight: 6,
  },
  cardLocation: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: Brand.terracotta,
    marginBottom: 6,
  },
  availPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  availPillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  specText: {
    fontSize: 11,
    color: Brand.gray500,
    fontWeight: '600',
  },
  footerPrompt: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heartIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 12,
    color: Brand.gray500,
    textAlign: 'center',
    marginBottom: 16,
  },
  exploreBtn: {
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
