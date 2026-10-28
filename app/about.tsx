import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About ImbaFind</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Brand Card */}
        <View style={styles.brandCard}>
          <View style={styles.logoBadge}>
            <Ionicons name="home" size={40} color={Brand.white} />
          </View>
          <View style={styles.brandRow}>
            <Text style={styles.brandImba}>Imba</Text>
            <Text style={styles.brandFind}>Find</Text>
          </View>
          <Text style={styles.tagline}>Find a place. Make it home.</Text>
          <Text style={styles.versionText}>Version 1.0.0 (Build 57)</Text>
        </View>

        {/* Mission */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>Our Mission</Text>
          <Text style={styles.cardParagraph}>
            ImbaFind is built specifically for Zimbabweans to bring trust, speed, and transparency to house hunting. Whether looking for a room, a garden flat, or a family residence in Bulawayo, Harare, Gweru, Mutare, or beyond, ImbaFind helps renters review listing details, check landlord verification badges, and connect with landlords.
          </Text>
        </View>

        {/* Key Features */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>Why ImbaFind?</Text>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={18} color={Brand.terracotta} />
            <Text style={styles.featureText}>Verified Zimbabwean properties & landlords</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={18} color={Brand.terracotta} />
            <Text style={styles.featureText}>Free scheduled in-person property viewings</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubbles" size={18} color={Brand.terracotta} />
            <Text style={styles.featureText}>Direct in-app messaging without agent markups</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={18} color={Brand.terracotta} />
            <Text style={styles.featureText}>Post accommodation requests & get matched</Text>
          </View>
        </View>

        {/* Made with pride */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Made for Zimbabwe • Bulawayo & Harare
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.navy,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  brandCard: {
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Brand.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandImba: {
    fontSize: 28,
    fontWeight: '900',
    color: Brand.navy,
  },
  brandFind: {
    fontSize: 28,
    fontWeight: '900',
    color: Brand.terracotta,
  },
  tagline: {
    fontSize: 14,
    color: Brand.gray600,
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    color: Brand.gray400,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 10,
  },
  cardParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray700,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: Brand.gray700,
    fontWeight: '500',
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: Brand.gray500,
    fontWeight: '500',
  },
});
