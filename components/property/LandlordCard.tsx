import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface LandlordCardProps {
  name: string;
  avatar: string;
  phone: string;
  email: string;
  isVerified: boolean;
  rating?: number;
  reviewsCount?: number;
  onMessage?: () => void;
  onCall?: () => void;
}

export const LandlordCard: React.FC<LandlordCardProps> = ({
  name,
  avatar,
  phone,
  isVerified,
  rating,
  reviewsCount,
  onMessage,
  onCall,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color={Brand.gray500} />
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {isVerified && <VerifiedBadge label="Verified Landlord" size="small" />}
          </View>
          <Text style={styles.role}>Property Owner / Landlord</Text>
          {rating !== undefined && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>
                Rating: {rating.toFixed(1)} / 5{reviewsCount !== undefined ? ` (${reviewsCount} reviews)` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        {onMessage && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.messageBtn]}
            onPress={onMessage}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Brand.white} />
            <Text style={styles.messageBtnText}>Message Landlord</Text>
          </TouchableOpacity>
        )}
        {onCall && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={onCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={16} color={Brand.navy} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.gray100,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.gray100,
  },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: {
    marginLeft: 14,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.navy,
  },
  role: {
    fontSize: 12,
    color: Brand.gray500,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: Brand.gray500,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  messageBtn: {
    backgroundColor: Brand.terracotta,
  },
  messageBtnText: {
    color: Brand.white,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  callBtn: {
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderColor: Brand.gray200,
    flex: 0.5,
  },
  callBtnText: {
    color: Brand.navy,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});
