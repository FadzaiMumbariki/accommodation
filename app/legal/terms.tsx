import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.cream} />

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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Effective Date: October 2025</Text>

        <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using the ImbaFind mobile application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.
        </Text>

        <Text style={styles.sectionHeading}>2. Landlord Obligations & Accuracy</Text>
        <Text style={styles.paragraph}>
          Landlords represent and warrant that all listed properties are accurate, genuinely available, lawfully owned or managed, and comply with Zimbabwean municipal housing and public health standards. Misleading rent pricing or nonexistent premises will result in permanent ban and potential reporting.
        </Text>

        <Text style={styles.sectionHeading}>3. Viewing Appointments & Scams Prevention</Text>
        <Text style={styles.paragraph}>
          ImbaFind strongly advises all tenants NEVER to send upfront viewing fees or cash deposits via EcoCash/InnBucks before physically viewing the property in person and verifying the identity and credentials of the landlord or authorized agent.
        </Text>

        <Text style={styles.sectionHeading}>4. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          ImbaFind serves as an introductory platform between prospective tenants and property owners. The formal lease contract is entered into exclusively between the tenant and landlord.
        </Text>

        <Text style={styles.sectionHeading}>5. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by and construed in accordance with the laws of the Republic of Zimbabwe.
        </Text>

        <Text style={styles.sectionHeading}>6. Information Used by the Service</Text>
        <Text style={styles.paragraph}>
          Operating ImbaFind involves processing account names and phone numbers, property photos, accommodation and viewing details, messages between users, and (when push notifications are enabled) an Expo push token. See the Privacy Policy for how this information is used and how to delete your account.
        </Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 13,
    color: Brand.gray500,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.navy,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray700,
    marginBottom: 12,
  },
});
