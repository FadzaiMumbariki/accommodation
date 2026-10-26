import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';

// ─── City skyline ─────────────────────────────────────────────────────────────
function CitySkyline() {
  return (
    <View style={sky.container} pointerEvents="none">
      <View style={[sky.hill, { left: -20, width: 180, height: 90 }]} />
      <View style={[sky.hill, { left: 120, width: 220, height: 70 }]} />
      <View style={[sky.hill, { right: -20, width: 180, height: 80 }]} />
      <View style={[sky.bldg, { left: 20, width: 28, height: 60 }]} />
      <View style={[sky.bldg, { left: 52, width: 18, height: 40 }]} />
      <View style={[sky.bldg, { left: 74, width: 24, height: 80 }]} />
      <View style={[sky.bldg, { left: 100, width: 14, height: 50 }]} />
      <View style={[sky.bldg, { left: 118, width: 32, height: 70 }]} />
      <View style={[sky.bldg, { left: 155, width: 20, height: 55 }]} />
      <View style={[sky.bldg, { left: 180, width: 26, height: 90, borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />
      <View style={[sky.bldg, { left: 210, width: 16, height: 45 }]} />
      <View style={[sky.bldg, { left: 230, width: 22, height: 65 }]} />
      <View style={[sky.bldg, { right: 80, width: 28, height: 55 }]} />
      <View style={[sky.bldg, { right: 48, width: 20, height: 70 }]} />
      <View style={[sky.bldg, { right: 20, width: 24, height: 48 }]} />
      <View style={[sky.tree, { left: 10, bottom: 28 }]} />
      <View style={[sky.tree, { right: 10, bottom: 28 }]} />
      <View style={[sky.tree, { right: 36, bottom: 30 }]} />
      <View style={sky.sun} />
      <Text style={[sky.bird, { right: 60, top: 10 }]}>~</Text>
      <Text style={[sky.bird, { right: 80, top: 18 }]}>~</Text>
    </View>
  );
}

const sky = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, overflow: 'hidden' },
  hill: { position: 'absolute', bottom: 0, backgroundColor: Brand.terracottaLight, borderTopLeftRadius: 120, borderTopRightRadius: 120, opacity: 0.35 },
  bldg: { position: 'absolute', bottom: 0, backgroundColor: Brand.terracotta, opacity: 0.55, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  tree: { position: 'absolute', width: 18, height: 28, backgroundColor: Brand.terracottaDark, borderTopLeftRadius: 9, borderTopRightRadius: 9, opacity: 0.6 },
  sun: { position: 'absolute', bottom: 30, right: 55, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4A460', opacity: 0.7 },
  bird: { position: 'absolute', color: Brand.terracottaDark, fontSize: 12, opacity: 0.5 },
});

// ─── House + checkmark hero illustration ──────────────────────────────────────
function HouseHero() {
  return (
    <View style={hero.wrap}>
      {/* Glow ring */}
      <View style={hero.glow} />
      {/* House body */}
      <View style={hero.body}>
        {/* Roof */}
        <View style={hero.roofWrap}>
          <View style={hero.roofLeft} />
          <View style={hero.roofRight} />
        </View>
        {/* House box */}
        <View style={hero.houseBox}>
          {/* Window grid */}
          <View style={hero.windowGrid}>
            <View style={hero.window} /><View style={hero.window} />
            <View style={hero.window} /><View style={hero.window} />
          </View>
          {/* Door */}
          <View style={hero.door} />
        </View>
      </View>
      {/* Green check badge */}
      <View style={hero.checkBadge}>
        <Ionicons name="checkmark" size={22} color={Brand.white} />
      </View>
      {/* Sparkle dashes */}
      <View style={[hero.spark, { top: 10, left: 16, transform: [{ rotate: '30deg' }] }]} />
      <View style={[hero.spark, { top: 18, left: 6, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[hero.spark, { top: 6, right: 18, transform: [{ rotate: '-40deg' }] }]} />
      <View style={[hero.spark, { top: 22, right: 8, transform: [{ rotate: '25deg' }] }]} />
      <View style={[hero.sparkDot, { top: 4, left: 30 }]} />
      <View style={[hero.sparkDot, { top: 8, right: 30 }]} />
    </View>
  );
}

const HOUSE_COLOR = Brand.terracotta;
const HOUSE_DARK  = Brand.terracottaDark;

const hero = StyleSheet.create({
  wrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 28, alignSelf: 'center' },
  glow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: Brand.terracottaLight, opacity: 0.3,
  },
  body: { alignItems: 'center' },
  roofWrap: { flexDirection: 'row', marginBottom: -2 },
  roofLeft: { width: 0, height: 0, borderBottomWidth: 36, borderRightWidth: 42, borderBottomColor: HOUSE_COLOR, borderRightColor: 'transparent' },
  roofRight: { width: 0, height: 0, borderBottomWidth: 36, borderLeftWidth: 42, borderBottomColor: HOUSE_COLOR, borderLeftColor: 'transparent' },
  houseBox: {
    width: 80, height: 64, backgroundColor: HOUSE_COLOR,
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    alignItems: 'center', paddingTop: 10,
  },
  windowGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5, width: 44, marginBottom: 6,
  },
  window: { width: 16, height: 16, backgroundColor: HOUSE_DARK, borderRadius: 3, opacity: 0.75 },
  door: { width: 20, height: 26, backgroundColor: HOUSE_DARK, borderTopLeftRadius: 10, borderTopRightRadius: 10, opacity: 0.75 },
  checkBadge: {
    position: 'absolute', bottom: 2, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Brand.success,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Brand.cream,
  },
  spark: { position: 'absolute', width: 14, height: 3, borderRadius: 2, backgroundColor: Brand.terracottaLight, opacity: 0.7 },
  sparkDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: Brand.terracottaLight, opacity: 0.6 },
});

// ─── Feature grid item ────────────────────────────────────────────────────────
function FeatureItem({
  icon,
  title,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
}) {
  return (
    <View style={feat.item}>
      <View style={feat.iconWrap}>
        <Ionicons name={icon} size={22} color={Brand.navy} />
      </View>
      <Text style={feat.title}>{title}</Text>
      <Text style={feat.sub}>{sub}</Text>
    </View>
  );
}

const feat = StyleSheet.create({
  item: { width: '22%', alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Brand.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Brand.gray200,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 12, fontWeight: '700', color: Brand.navy, textAlign: 'center' },
  sub: { fontSize: 10, color: Brand.gray500, textAlign: 'center', lineHeight: 14 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AccountCreatedScreen() {
  const { checkEmail } = useLocalSearchParams<{ checkEmail?: string }>();
  const needsEmailConfirmation = checkEmail === '1';
  const { userRole } = useApp();
  const isTenant = userRole !== 'landlord';

  const roleLabel = isTenant ? 'Tenant' : 'Landlord';
  const roleDesc = isTenant
    ? 'You can search, save, message and book viewings.'
    : 'You can list properties and manage viewings.';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="home" size={22} color={Brand.white} />
          </View>
          <View style={styles.brandRow}>
            <Text style={styles.brandImba}>Imba</Text>
            <Text style={styles.brandFind}>Find</Text>
          </View>
          <Text style={styles.tagline}>Find a place. Make it home.</Text>
        </View>

        {/* House hero */}
        {!needsEmailConfirmation && <HouseHero />}

        {/* Title */}
        <Text style={styles.title}>
          {needsEmailConfirmation ? 'Check your email to confirm' : <>Your account has been{'\n'}created!</>}
        </Text>
        <Text style={styles.subtitle}>
          {needsEmailConfirmation
            ? 'We sent you a confirmation link. Open it to activate your ImbaFind account, then sign in.'
            : <>Welcome to ImbaFind! You&apos;re all set to start{'\n'}finding your next home or list your property.</>}
        </Text>

        {/* Role card */}
        {!needsEmailConfirmation && <View style={styles.roleCard}>
          <View style={styles.roleIconWrap}>
            <Ionicons name={isTenant ? 'person-outline' : 'business-outline'} size={22} color={Brand.terracotta} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>You&apos;re now a {roleLabel}</Text>
            <Text style={styles.roleDesc}>{roleDesc}</Text>
          </View>
        </View>}

        {/* Feature grid */}
        {!needsEmailConfirmation && <View style={styles.featureGrid}>
          <FeatureItem icon="search-outline" title="Discover" sub={'Find available\nproperties'} />
          <FeatureItem icon="heart-outline" title="Save" sub={'Keep your\nfavourites'} />
          <FeatureItem icon="chatbubble-outline" title="Chat" sub={'Message landlords\ndirectly'} />
          <FeatureItem icon="calendar-outline" title="Book" sub={'Schedule\nviewings'} />
        </View>}

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.replace(needsEmailConfirmation ? '/login' : '/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{needsEmailConfirmation ? 'Back to Sign In' : 'Start Exploring'}</Text>
          {!needsEmailConfirmation && <Ionicons name="arrow-forward" size={18} color={Brand.white} />}
        </TouchableOpacity>

        {!needsEmailConfirmation && <TouchableOpacity
          style={styles.homeLink}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.homeLinkText}>Go to Home</Text>
        </TouchableOpacity>}

        {/* Skyline spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <CitySkyline />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  scroll: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 20 },

  // Logo
  logoRow: { alignItems: 'center', gap: 6, marginBottom: 32 },
  logoBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Brand.terracotta,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  brandRow: { flexDirection: 'row' },
  brandImba: { fontSize: 24, fontWeight: '900', color: Brand.navy },
  brandFind: { fontSize: 24, fontWeight: '900', color: Brand.terracotta },
  tagline: { fontSize: 12, color: Brand.gray500 },

  title: {
    fontSize: 26, fontWeight: '800', color: Brand.navy,
    textAlign: 'center', lineHeight: 34, marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, color: Brand.gray500, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },

  // Role card
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Brand.white,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Brand.gray100,
    marginBottom: 28,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  roleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Brand.terracotta + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  roleLabel: { fontSize: 14, fontWeight: '800', color: Brand.navy, marginBottom: 3 },
  roleDesc: { fontSize: 12, color: Brand.gray500, lineHeight: 17 },

  // Feature grid
  featureGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 36,
  },

  // CTA
  ctaBtn: {
    backgroundColor: Brand.terracotta, borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10,
    elevation: 5, marginBottom: 14,
  },
  ctaBtnText: { color: Brand.white, fontSize: 16, fontWeight: '700' },

  homeLink: { alignItems: 'center', paddingVertical: 8 },
  homeLinkText: { fontSize: 14, color: Brand.gray500, fontWeight: '500' },
});
