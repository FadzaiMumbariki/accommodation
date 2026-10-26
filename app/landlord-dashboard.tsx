import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';

export default function LandlordDashboardScreen() {
  const { myListings, viewings, conversations, requests, updateProperty, deleteProperty } = useApp();
  const scrollRef = useRef<ScrollView>(null);

  const myListingIds = useMemo(() => new Set(myListings.map(p => p.id)), [myListings]);
  const totalListings = myListings.length;
  const availableCount = myListings.filter(p => p.available).length;
  const occupiedCount = totalListings - availableCount;
  const viewingReqForMe = viewings.filter(v => v.propertyId && myListingIds.has(v.propertyId)).length;
  const msgForMe = conversations.filter(c => c.propertyId && myListingIds.has(c.propertyId)).length;
  const tenantReq = requests.length;

  const openProp = (id: string) => {
    router.push(`/property-details?id=${id}`);
  };

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      await updateProperty(id, {
        available: !available,
        availabilityStatus: available ? 'occupied' : 'available_now',
      });
    } catch (error) {
      console.error('[LandlordDashboard] Availability update failed:', error);
      Alert.alert('Could not update availability', 'Please check your connection and try again.');
    }
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete listing?', `“${title}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProperty(id);
          } catch (error) {
            console.error('[LandlordDashboard] Listing deletion failed:', error);
            Alert.alert('Could not delete listing', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Landlord Dashboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Stats Grid Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{totalListings}</Text>
              <Text style={styles.statLabel}>Total Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{availableCount}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{occupiedCount}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
          </View>

          <View style={styles.statsHorizontalDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{viewingReqForMe}</Text>
              <Text style={styles.statLabel}>Viewing Requests</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{msgForMe}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNumber}>{tenantReq}</Text>
              <Text style={styles.statLabel}>Tenant Requests</Text>
            </View>
          </View>
        </View>

        {/* + Add Property Button */}
        <TouchableOpacity
          style={styles.addPropertyBtn}
          onPress={() => router.push('/add-property')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={Brand.white} />
          <Text style={styles.addPropertyBtnText}>+ Add Property</Text>
        </TouchableOpacity>

        {/* 3 Action Tiles */}
        <View style={styles.actionTilesRow}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={22} color={Brand.navy} />
            <Text style={styles.actionTileText}>Manage Listings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => router.push('/my-activity')}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={22} color={Brand.navy} />
            <Text style={styles.actionTileText}>View Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => router.push('/(tabs)/messages')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={Brand.navy} />
            <Text style={styles.actionTileText}>View Messages</Text>
          </TouchableOpacity>
        </View>

        {/* My Listings Section */}
        <Text style={styles.sectionTitle}>My Listings</Text>

        {myListings.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="home-outline" size={36} color={Brand.gray300} />
            <Text style={styles.emptySectionText}>
              You haven&apos;t listed any properties yet. Add your first property to start receiving enquiries.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-property')}>
              <Text style={styles.emptyBtnText}>+ Add Property</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myListings.map((prop) => (
            <View key={prop.id} style={styles.listingWrap}>
              <TouchableOpacity
                style={styles.propertyCard}
                onPress={() => openProp(prop.id)}
                activeOpacity={0.88}
              >
                <Image
                  source={{ uri: prop.images[0] }}
                  style={styles.cardThumb}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {prop.title}
                  </Text>
                  <Text style={styles.cardLocation}>
                    {prop.suburb}, {prop.city}
                  </Text>
                  <Text style={styles.cardPrice}>${prop.price}/month</Text>
                </View>
                <View style={prop.available ? styles.availableBadge : styles.occupiedBadge}>
                  <Text style={prop.available ? styles.availableBadgeText : styles.occupiedBadgeText}>
                    {prop.available ? 'Available' : 'Occupied'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.listingActions}>
                <TouchableOpacity
                  style={styles.listingAction}
                  onPress={() => router.push(`/add-property?editId=${encodeURIComponent(prop.id)}`)}
                  accessibilityLabel={`Edit ${prop.title}`}
                >
                  <Ionicons name="create-outline" size={17} color={Brand.navy} />
                  <Text style={styles.listingActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.listingAction}
                  onPress={() => toggleAvailability(prop.id, prop.available)}
                  accessibilityLabel={`${prop.available ? 'Mark' : 'Make'} ${prop.title} ${prop.available ? 'unavailable' : 'available'}`}
                >
                  <Ionicons
                    name={prop.available ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={Brand.navy}
                  />
                  <Text style={styles.listingActionText}>
                    {prop.available ? 'Pause' : 'Make available'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.listingAction}
                  onPress={() => confirmDelete(prop.id, prop.title)}
                  accessibilityLabel={`Delete ${prop.title}`}
                >
                  <Ionicons name="trash-outline" size={17} color={Brand.error} />
                  <Text style={[styles.listingActionText, { color: Brand.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: Brand.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Brand.gray500,
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: Brand.gray200,
  },
  statsHorizontalDivider: {
    height: 1,
    backgroundColor: Brand.gray200,
    marginVertical: 10,
    marginHorizontal: 10,
  },
  addPropertyBtn: {
    backgroundColor: Brand.terracotta,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addPropertyBtnText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '700',
  },
  actionTilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionTile: {
    flex: 1,
    backgroundColor: Brand.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionTileText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.navy,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 12,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 12,
    gap: 12,
    borderWidth: 0,
    marginBottom: 0,
  },
  listingWrap: {
    marginBottom: 14,
    backgroundColor: Brand.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
    overflow: 'hidden',
  },
  listingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
    paddingVertical: 10,
  },
  listingAction: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 },
  listingActionText: { fontSize: 12, fontWeight: '700', color: Brand.navy },
  cardThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: Brand.gray500,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.terracotta,
  },
  availableBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availableBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  occupiedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  occupiedBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptySectionText: {
    fontSize: 13,
    color: Brand.gray500,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
