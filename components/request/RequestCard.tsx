import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccommodationRequest } from '../../types';
import { Brand } from '../../constants/Colors';
import { StatusBadge } from '../common/StatusBadge';

interface RequestCardProps {
  request: AccommodationRequest;
  onContact?: () => void;
  showContactAction?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onContact,
  showContactAction = false,
}) => {
  const suburb = request.suburb ?? '';
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={16} color={Brand.terracotta} />
          <Text style={styles.locationText}>
            {suburb}, {request.city}
          </Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <Text style={styles.budget}>
        Budget: ${request.minBudget} – ${request.maxBudget}
        <Text style={styles.perMonth}> / month</Text>
      </Text>

      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Type:</Text>
          <Text style={styles.specValue}>{request.propertyType}</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Bedrooms:</Text>
          <Text style={styles.specValue}>{request.bedrooms}</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Occupants:</Text>
          <Text style={styles.specValue}>{request.numberOfPeople} people</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Move-in:</Text>
          <Text style={styles.specValue}>{request.moveInDate}</Text>
        </View>
      </View>

      {(request.additionalNotes || request.additionalRequirements) ? (
        <Text style={styles.notes}>&quot;{request.additionalNotes || request.additionalRequirements}&quot;</Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.userRow}>
          <Ionicons name="person-circle-outline" size={18} color={Brand.gray500} />
          <Text style={styles.userName}>{request.userName}</Text>
        </View>
        {showContactAction && onContact && (
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={onContact}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={14} color={Brand.white} />
            <Text style={styles.contactBtnText}>Offer Property</Text>
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
  budget: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.terracotta,
    marginBottom: 12,
  },
  perMonth: {
    fontSize: 13,
    fontWeight: '500',
    color: Brand.gray500,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: Brand.creamDark,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  spec: {
    flexDirection: 'row',
    gap: 4,
  },
  specLabel: {
    fontSize: 12,
    color: Brand.gray500,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
    textTransform: 'capitalize',
  },
  notes: {
    fontSize: 13,
    color: Brand.navy,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Brand.gray200,
    paddingTop: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 12,
    color: Brand.gray500,
    fontWeight: '500',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  contactBtnText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
