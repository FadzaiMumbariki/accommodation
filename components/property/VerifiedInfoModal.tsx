import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface VerifiedInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VerifiedInfoModal({ visible, onClose }: VerifiedInfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={28} color={Brand.navy} />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close verified information modal"
            >
              <Ionicons name="close" size={22} color={Brand.gray500} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>What does Verified mean?</Text>
          <Text style={styles.subtitle}>
            Vetted by ImbaFind trust & safety administrators
          </Text>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.checkItem}>
              <Ionicons name="shield-checkmark" size={18} color="#2E7D32" style={styles.checkIcon} />
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkTitle}>Identity Vetted</Text>
                <Text style={styles.checkDesc}>
                  The landlord submitted a verified government-issued national ID or passport.
                </Text>
              </View>
            </View>

            <View style={styles.checkItem}>
              <Ionicons name="home" size={18} color="#2E7D32" style={styles.checkIcon} />
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkTitle}>Ownership / Authority Inspected</Text>
                <Text style={styles.checkDesc}>
                  Proof of title deeds, council rates bills, or a signed mandate of property management was inspected.
                </Text>
              </View>
            </View>

            <View style={styles.checkItem}>
              <Ionicons name="call" size={18} color="#2E7D32" style={styles.checkIcon} />
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkTitle}>Contact Confirmed</Text>
                <Text style={styles.checkDesc}>
                  The landlord’s contact number and Zimbabwean location details were directly confirmed.
                </Text>
              </View>
            </View>

            <View style={styles.safetyBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#C62828" />
              <Text style={styles.safetyText}>
                Always stay safe: Never send money or deposits via EcoCash or Mukuru before physically inspecting the property in person.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Got it"
          >
            <Text style={styles.actionBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 76, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Brand.gray600,
    marginBottom: 16,
  },
  bodyScroll: {
    maxHeight: 260,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  checkIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  checkTextContainer: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.navy,
    marginBottom: 2,
  },
  checkDesc: {
    fontSize: 12,
    color: Brand.gray600,
    lineHeight: 17,
  },
  safetyBox: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    color: '#C62828',
    lineHeight: 16,
    fontWeight: '500',
  },
  actionBtn: {
    backgroundColor: Brand.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
