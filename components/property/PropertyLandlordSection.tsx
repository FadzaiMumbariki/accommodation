import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import type { Landlord } from '../../types';

interface PropertyLandlordSectionProps {
  landlord?: Landlord;
  propertyRating?: number;
  onCall: () => void;
  onWhatsApp: () => void;
  onMessage: () => void;
}

export const PropertyLandlordSection: React.FC<PropertyLandlordSectionProps> = ({
  landlord,
  propertyRating,
  onCall,
  onWhatsApp,
  onMessage,
}) => {
  const rating = landlord?.rating ?? propertyRating;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Landlord</Text>

      <View style={styles.landlordCard}>
        {landlord?.avatar ? (
          <Image
            source={{ uri: landlord.avatar }}
            style={styles.landlordAvatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityLabel={`${landlord.name || 'Landlord'} photo`}
          />
        ) : (
          <View style={[styles.landlordAvatar, styles.landlordAvatarPlaceholder]}>
            <Text style={styles.landlordAvatarInitial}>{landlord?.name?.charAt(0) || '?'}</Text>
          </View>
        )}

        <View style={styles.landlordDetails}>
          <View style={styles.landlordNameRow}>
            <Text style={styles.landlordName}>{landlord?.name || 'Landlord'}</Text>
            {landlord?.verified && <Ionicons name="shield-checkmark" size={15} color="#2563EB" />}
          </View>
          {rating != null && <Text style={styles.landlordMeta}>Rating: {rating} / 5</Text>}
        </View>
      </View>

      {/* Action Buttons: Call, WhatsApp, Message */}
      <View style={styles.landlordActions}>
        <TouchableOpacity
          style={[styles.landlordActionBtn, styles.landlordActionBtnSecondary]}
          onPress={onCall}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Call landlord"
        >
          <Ionicons name="call-outline" size={18} color={Brand.terracotta} />
          <Text style={[styles.landlordActionBtnText, { color: Brand.terracotta }]}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.landlordActionBtn, styles.landlordActionBtnWhatsApp]}
          onPress={onWhatsApp}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Chat on WhatsApp"
        >
          <Ionicons name="logo-whatsapp" size={18} color={Brand.white} />
          <Text style={[styles.landlordActionBtnText, { color: Brand.white }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.landlordActionBtn, styles.landlordActionBtnPrimary]}
          onPress={onMessage}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Send in-app message"
        >
          <Ionicons name="chatbubble-outline" size={18} color={Brand.white} />
          <Text style={[styles.landlordActionBtnText, { color: Brand.white }]}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 8,
    marginTop: 16,
  },
  landlordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  landlordAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.gray100,
  },
  landlordAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.navy,
  },
  landlordAvatarInitial: {
    color: Brand.white,
    fontSize: 18,
    fontWeight: '700',
  },
  landlordDetails: {
    marginLeft: 14,
    flex: 1,
  },
  landlordNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landlordName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
  landlordMeta: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  landlordActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  landlordActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  landlordActionBtnSecondary: {
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.terracotta,
  },
  landlordActionBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  landlordActionBtnPrimary: {
    backgroundColor: Brand.terracotta,
  },
  landlordActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
