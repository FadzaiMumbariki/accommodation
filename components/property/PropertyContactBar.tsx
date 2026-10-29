/**
 * PropertyContactBar — extracted from property-details.tsx.
 * Sticky bottom action bar: WhatsApp, Message, Book Viewing, Save.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface PropertyContactBarProps {
  saved: boolean;
  propertyTitle: string;
  chatStarting: boolean;
  onWhatsApp: () => void;
  onMessage: () => void;
  onBookViewing: () => void;
  onToggleSaved: () => void;
}

export function PropertyContactBar({
  saved,
  propertyTitle,
  chatStarting,
  onWhatsApp,
  onMessage,
  onBookViewing,
  onToggleSaved,
}: PropertyContactBarProps) {
  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={styles.waBtn}
        onPress={onWhatsApp}
        activeOpacity={0.8}
        accessibilityLabel="Chat on WhatsApp"
        accessibilityRole="button"
      >
        <Ionicons name="logo-whatsapp" size={22} color={Brand.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.msgBtn}
        onPress={onMessage}
        activeOpacity={0.8}
        disabled={chatStarting}
      >
        <Text style={styles.msgBtnText}>Message</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.viewingBtn} onPress={onBookViewing} activeOpacity={0.85}>
        <Text style={styles.viewingBtnText}>Book Viewing</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.heartBtn}
        onPress={onToggleSaved}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          saved ? `Remove ${propertyTitle} from saved listings` : `Save ${propertyTitle}`
        }
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={22}
          color={saved ? '#E5534B' : Brand.navy}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  waBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  msgBtn: {
    flex: 1,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.terracotta,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBtnText: { color: Brand.terracotta, fontSize: 14, fontWeight: '700' },
  viewingBtn: {
    flex: 1,
    backgroundColor: Brand.terracotta,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewingBtnText: { color: Brand.white, fontSize: 14, fontWeight: '700' },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
});
