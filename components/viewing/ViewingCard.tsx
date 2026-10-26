import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ViewingRequest, UserRole } from '../../types';
import { Brand } from '../../constants/Colors';
import { StatusBadge } from '../common/StatusBadge';

interface ViewingCardProps {
  viewing: ViewingRequest;
  role?: UserRole;
  onPressProperty?: () => void;
  onConfirm?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ViewingCard: React.FC<ViewingCardProps> = ({
  viewing,
  role = 'tenant',
  onPressProperty,
  onConfirm,
  onDecline,
  onComplete,
  onCancel,
}) => {
  const attendees = viewing.attendees ?? viewing.numberOfPeople;
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.propertyHeader}
        onPress={onPressProperty}
        activeOpacity={0.8}
      >
        {viewing.propertyImage ? (
          <Image
            source={{ uri: viewing.propertyImage }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.thumbnail, styles.imagePlaceholder]}>
            <Ionicons name="home-outline" size={22} color={Brand.gray400} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {viewing.propertyTitle}
          </Text>
          {viewing.propertyLocation && (
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {viewing.propertyLocation}
            </Text>
          )}
          {viewing.propertyPrice !== undefined && (
            <Text style={styles.price}>${viewing.propertyPrice} / month</Text>
          )}
        </View>
        <View style={styles.statusBadgeWrapper}>
          <StatusBadge status={viewing.status} />
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.timingRow}>
        <View style={styles.timingItem}>
          <Ionicons name="calendar-outline" size={16} color={Brand.terracotta} />
          <Text style={styles.timingText}>{viewing.date}</Text>
        </View>
        <View style={styles.timingItem}>
          <Ionicons name="time-outline" size={16} color={Brand.terracotta} />
          <Text style={styles.timingText}>{viewing.time}</Text>
        </View>
        <View style={styles.timingItem}>
          <Ionicons name="people-outline" size={16} color={Brand.terracotta} />
          <Text style={styles.timingText}>{attendees} Attending</Text>
        </View>
      </View>

      {(viewing.notes || viewing.message) && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{viewing.notes || viewing.message}</Text>
        </View>
      )}

      {role === 'landlord' && viewing.status === 'pending' && (
        <View style={styles.actionsRow}>
          {onDecline && (
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          )}
          {onConfirm && (
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Confirm Viewing</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {role === 'landlord' && viewing.status === 'confirmed' && onComplete && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.confirmBtn]}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmText}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}
      {role === 'tenant' &&
        (viewing.status === 'pending' || viewing.status === 'confirmed') &&
        onCancel && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.declineText}>Cancel Viewing</Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: Brand.creamDark,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 2,
  },
  propertyLocation: {
    fontSize: 12,
    color: Brand.gray500,
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  statusBadgeWrapper: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: Brand.gray200,
    marginVertical: 12,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Brand.creamDark,
    padding: 10,
    borderRadius: 10,
  },
  timingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
  },
  notesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FAF9F6',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.gray500,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: Brand.navy,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: Brand.terracotta,
  },
  confirmText: {
    color: Brand.white,
    fontWeight: '700',
    fontSize: 13,
  },
  declineBtn: {
    backgroundColor: Brand.creamDark,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  declineText: {
    color: Brand.error,
    fontWeight: '600',
    fontSize: 13,
  },
});
