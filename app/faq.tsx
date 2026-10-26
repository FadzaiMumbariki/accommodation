import React, { useState } from 'react';
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

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How do I book a viewing?',
    answer: 'Navigate to any property page, tap the "Book Viewing" button at the bottom, select your preferred date, time slot, and number of people attending, then submit. The landlord will receive the appointment request instantly.',
  },
  {
    question: 'Are properties on ImbaFind verified?',
    answer: 'Look for the "Verified" badge with the shield icon. Verified listings have had their location, physical status, and landlord ownership documents vetted by our verification team.',
  },
  {
    question: 'Should I pay a fee to view a house?',
    answer: 'No! ImbaFind strictly prohibits landlords and agents from demanding upfront viewing fees. Never send money before seeing the property in person.',
  },
  {
    question: 'How does posting an Accommodation Request work?',
    answer: 'If you cannot find what you are looking for, tap "Post Request" to submit your preferred area, budget, and requirements. Landlords with matching vacant properties will message you directly.',
  },
  {
    question: 'How do I list my property as a landlord?',
    answer: 'Switch to Landlord mode in your Profile or tap "List Property", then fill in the title, suburb, rent price, deposit, bedrooms, and amenities to publish your listing instantly.',
  },
];

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

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
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Everything you need to know about renting and listing on ImbaFind.
        </Text>

        {FAQS.map((faq, index) => {
          const isOpen = expandedIndex === index;
          return (
            <View key={index} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => toggle(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.questionText}>{faq.question}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Brand.terracotta}
                />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.answerWrap}>
                  <Text style={styles.answerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
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
  subtitle: {
    fontSize: 14,
    color: Brand.gray600,
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: Brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginBottom: 12,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
    flex: 1,
    paddingRight: 10,
  },
  answerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
    paddingTop: 12,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: Brand.gray700,
  },
});
