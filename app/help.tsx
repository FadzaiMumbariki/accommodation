import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { SUPPORT_CONTACT } from '../constants/support';

export default function HelpSupportScreen() {
  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_CONTACT.phone}`);
  };

  const handleWhatsApp = () => {
    const phone = SUPPORT_CONTACT.whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent('Hello ImbaFind Support');
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('ImbaFind Assistance');
    Linking.openURL(`mailto:${SUPPORT_CONTACT.email}?subject=${subject}`);
  };

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Safety First Banner */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyTitleRow}>
            <Ionicons name="shield-checkmark" size={20} color={Brand.terracotta} />
            <Text style={styles.safetyTitle}>Safety Notice</Text>
          </View>
          <Text style={styles.safetyText}>
            Never send advance viewing fees, deposit payments, or key money through EcoCash, InnBucks, or Mukuru before physically inspecting the property and meeting the landlord or accredited agent in person.
          </Text>
        </View>

        {/* Quick Contact Options */}
        <Text style={styles.sectionTitle}>Get in Touch</Text>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={handleWhatsApp}
          accessibilityRole="button"
          accessibilityLabel="Contact support on WhatsApp"
        >
          <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.contactLabel}>WhatsApp Support</Text>
            <Text style={styles.contactSub}>Instant help from our local team</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Brand.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={handleCall}
          accessibilityRole="button"
          accessibilityLabel="Call support"
        >
          <View style={[styles.iconWrap, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="call-outline" size={22} color={Brand.info} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.contactLabel}>Phone Helpline</Text>
            <Text style={styles.contactSub}>
              {SUPPORT_CONTACT.phone} ({SUPPORT_CONTACT.businessHours})
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={handleEmail}
          accessibilityRole="button"
          accessibilityLabel="Email support"
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="mail-outline" size={22} color={Brand.warning} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactSub}>{SUPPORT_CONTACT.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
        </TouchableOpacity>

        {/* Frequently Asked Questions */}
        <Text style={styles.sectionTitle}>Self Service</Text>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/faq')}
        >
          <Ionicons name="help-circle-outline" size={22} color={Brand.navy} />
          <View style={styles.rowInfo}>
            <Text style={styles.contactLabel}>Frequently Asked Questions (FAQ)</Text>
            <Text style={styles.contactSub}>Find quick answers to common questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/about')}
        >
          <Ionicons name="information-circle-outline" size={22} color={Brand.navy} />
          <View style={styles.rowInfo}>
            <Text style={styles.contactLabel}>About ImbaFind</Text>
            <Text style={styles.contactSub}>Zimbabwe&apos;s dedicated accommodation platform</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
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
  safetyCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  safetyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.terracotta,
  },
  safetyText: {
    fontSize: 13,
    color: Brand.navy,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 10,
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
  contactSub: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
    gap: 12,
  },
});
