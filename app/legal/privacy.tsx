import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Effective Date: October 2025</Text>

        <Text style={styles.sectionHeading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          ImbaFind collects your name and phone number when you create or update an account; property photos and listing details when you post a property; accommodation request and viewing details; and messages you send to other users. If you enable push notifications, we also store your Expo push token to deliver notifications to your device. We collect only the information needed to operate these features.
        </Text>

        <Text style={styles.sectionHeading}>2. Verification & Safety</Text>
        <Text style={styles.paragraph}>
          To safeguard our community against fraud and illegitimate listings, landlords may be requested to verify property ownership or tenancy authorization. Phone numbers and contact info are safeguarded under the Zimbabwe Data Protection Act (Cyber and Data Protection Act [Chapter 12:07]).
        </Text>

        <Text style={styles.sectionHeading}>3. How We Use Information</Text>
        <Text style={styles.paragraph}>
          We use personal information to:
          {"\n"}• Help tenants check landlord verification status and connect with landlords
          {"\n"}• Schedule viewing appointments
          {"\n"}• Facilitate in-app communications
          {"\n"}• Send relevant notifications and updates
          {"\n"}• Prevent fraud and enforce our Terms of Service
        </Text>

        <Text style={styles.sectionHeading}>4. Optional AI Features</Text>
        <Text style={styles.paragraph}>
          If you use an AI feature, the relevant search text, accommodation request details, or listing details and description may be sent to Google Gemini through our Supabase server to provide search filters, match explanations, description drafts, or listing-description warnings. Your name, contact details, photos, and messages are not sent for these AI requests. AI output can be inaccurate: trust warnings are guidance only and do not verify ownership or prove fraud. Signed-in accounts are limited to 30 AI requests per hour across features.
        </Text>

        <Text style={styles.sectionHeading}>5. Data Sharing & Security</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. Listing photos and listing details are visible to app users. Your name and phone number may be shown to users involved in a viewing request or conversation. Messages are visible to the participants in their conversation. Push tokens are used only to route notifications to your device.
        </Text>

        <Text style={styles.sectionHeading}>6. Your Rights & Contact</Text>
        <Text style={styles.paragraph}>
          You can request deletion of your account and associated data from Settings. You may also request access or correction by emailing privacy@imbafind.co.zw. Account deletion removes your uploaded property photos before deleting your account.
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
