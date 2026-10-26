import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types';

export default function ChooseAccountTypeScreen() {
  const { setUserRole } = useApp();

  const handleSelect = (role: UserRole) => {
    setUserRole(role);
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.cream} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back and Top Logo */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Brand.navy} />
          </TouchableOpacity>
          <View style={styles.topLogo}>
            <View style={styles.logoBadge}>
              <Ionicons name="home" size={20} color={Brand.white} />
            </View>
            <View style={styles.brandContainer}>
              <View style={styles.brandRow}>
                <Text style={styles.brandImba}>Imba</Text>
                <Text style={styles.brandFind}>Find</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.title}>How will you use ImbaFind?</Text>
        <Text style={styles.subtitle}>Choose your account type to personalize your experience.</Text>

        {/* Tenant Card */}
        <View style={styles.card}>
          <View style={[styles.iconCircle, styles.circleTenant]}>
            <Ionicons name="home" size={26} color={Brand.white} />
          </View>
          <Text style={styles.cardTitle}>I&apos;m looking for accommodation</Text>
          <Text style={styles.cardSubtitle}>Search rooms, cottages, flats, or houses across Zimbabwe.</Text>
          <TouchableOpacity
            style={styles.btnFilled}
            activeOpacity={0.85}
            onPress={() => handleSelect('tenant')}
          >
            <Text style={styles.btnFilledText}>Continue as Tenant</Text>
          </TouchableOpacity>
        </View>

        {/* Landlord Card */}
        <View style={styles.card}>
          <View style={[styles.iconCircle, styles.circleLandlord]}>
            <Ionicons name="key" size={26} color={Brand.white} />
          </View>
          <Text style={styles.cardTitle}>I&apos;m a property owner / landlord</Text>
          <Text style={styles.cardSubtitle}>List your properties, manage bookings, and chat with tenants.</Text>
          <TouchableOpacity
            style={styles.btnOutline}
            activeOpacity={0.85}
            onPress={() => handleSelect('landlord')}
          >
            <Text style={styles.btnOutlineText}>Continue as Landlord</Text>
          </TouchableOpacity>
        </View>

        {/* Skip option */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => {
            setUserRole('tenant');
            router.replace('/(tabs)');
          }}
        >
          <Text style={styles.skipBtnText}>Skip for now & browse accommodations →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 48,
    flexGrow: 1,
  },
  topLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  brandContainer: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
  },
  brandImba: {
    fontSize: 24,
    fontWeight: '900',
    color: Brand.terracotta,
  },
  brandFind: {
    fontSize: 24,
    fontWeight: '900',
    color: Brand.terracotta,
  },
  tagline: {
    fontSize: 12,
    color: Brand.gray500,
    fontWeight: '500',
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 24,
    lineHeight: 30,
  },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'flex-start',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  circleTenant: {
    backgroundColor: Brand.terracotta,
  },
  circleLandlord: {
    backgroundColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Brand.gray500,
    marginBottom: 20,
    lineHeight: 20,
  },
  btnFilled: {
    width: '100%',
    backgroundColor: Brand.terracotta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilledText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnOutline: {
    width: '100%',
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.terracotta,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    color: Brand.terracotta,
    fontSize: 15,
    fontWeight: '700',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.gray500,
    marginBottom: 24,
    lineHeight: 20,
  },
  skipBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.terracotta,
  },
});
