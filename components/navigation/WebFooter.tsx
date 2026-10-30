import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { useResponsive } from '../../hooks/useResponsive';

export const WebFooter: React.FC = () => {
  const { isDesktop, isTablet } = useResponsive();

  if (!isDesktop && !isTablet) {
    return null;
  }

  const handleNav = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.footerWrapper}>
      <View style={styles.footerContent}>
        {/* Brand & Mission */}
        <View style={styles.colBrand}>
          <View style={styles.brandTitleRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="home" size={16} color={Brand.white} />
            </View>
            <Text style={styles.brandTitle}>
              Imba<Text style={{ color: Brand.terracotta }}>Find</Text>
            </Text>
          </View>
          <Text style={styles.brandDesc}>
            Zimbabwe&apos;s verified accommodation marketplace. Connecting home seekers directly
            with trusted landlords across Harare, Bulawayo, Mutare, Gweru, and Chitungwiza.
          </Text>
          <View style={styles.trustBadges}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={13} color={Brand.success} />
              <Text style={styles.trustBadgeText}>Direct Landlord Verification</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
              <Text style={styles.trustBadgeText}>Zero Agent Surcharges</Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.colLinks}>
          <Text style={styles.colHeader}>Explore Cities</Text>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Harare (Avondale, Borrowdale)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Bulawayo (Suburbs, CBD)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Chitungwiza & Norton</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Mutare, Gweru & Masvingo</Text>
          </TouchableOpacity>
        </View>

        {/* Property Types */}
        <View style={styles.colLinks}>
          <Text style={styles.colHeader}>Accommodation</Text>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Apartments & Flats</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Full Family Houses</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Cottages & Guest Wings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/(tabs)/explore')} style={styles.linkRow}>
            <Text style={styles.linkText}>Student Rooms & Bedsitters</Text>
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.colLinks}>
          <Text style={styles.colHeader}>Resources & Safety</Text>
          <TouchableOpacity onPress={() => handleNav('/ai-chat')} style={styles.linkRow}>
            <Text style={styles.linkText}>AI Rental Assistant</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/help')} style={styles.linkRow}>
            <Text style={styles.linkText}>Scam Prevention & Safety</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/legal/privacy')} style={styles.linkRow}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('/legal/terms')} style={styles.linkRow}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Copyright */}
      <View style={styles.bottomBar}>
        <Text style={styles.copyText}>
          &copy; {new Date().getFullYear()} ImbaFind Zimbabwe. All rights reserved. Built for Zimbabwean home seekers and property owners.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerWrapper: {
    backgroundColor: Brand.navy,
    borderTopWidth: 1,
    borderTopColor: Brand.navy + '30',
    paddingTop: 48,
    marginTop: 40,
    width: '100%',
  },
  footerContent: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 32,
    paddingBottom: 40,
  },
  colBrand: {
    flex: 2,
    minWidth: 260,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.white,
  },
  brandDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: Brand.gray300,
    marginBottom: 16,
    maxWidth: 360,
  },
  trustBadges: {
    gap: 8,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.gray200,
  },
  colLinks: {
    flex: 1,
    minWidth: 160,
  },
  colHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.white,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  linkRow: {
    paddingVertical: 5,
  },
  linkText: {
    fontSize: 13,
    color: Brand.gray300,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  copyText: {
    fontSize: 12,
    color: Brand.gray400,
    textAlign: 'center',
  },
});
