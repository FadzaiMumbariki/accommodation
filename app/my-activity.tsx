import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';
import { ViewingCard } from '../components/viewing/ViewingCard';
import { RequestCard } from '../components/request/RequestCard';

export default function MyActivityScreen() {
  const { viewingId } = useLocalSearchParams<{ viewingId?: string }>();
  const {
    requests,
    viewings,
    properties,
    savedPropertyIds,
    conversations,
    updateViewingStatus,
    userRole,
    activityLoading,
    activityError,
    refreshActivity,
    updateRequestStatus,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'Requests' | 'Viewings' | 'Applications'>(
    () => viewingId ? 'Viewings' : 'Requests',
  );

  const changeStatus = async (id: string, status: 'confirmed' | 'rejected' | 'completed' | 'cancelled') => {
    try {
      await updateViewingStatus(id, status);
    } catch (error) {
      console.error('[MyActivity] Could not update viewing status:', error);
      Alert.alert('Could not update viewing', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const changeRequestStatus = async (id: string, status: 'active' | 'paused' | 'closed') => {
    try {
      await updateRequestStatus(id, status);
    } catch (error) {
      console.error('[MyActivity] Could not update request status:', error);
      Alert.alert('Could not update request', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const savedProperties = properties.filter((p) => savedPropertyIds.includes(p.id));

  const openProp = (id?: string) => {
    const targetId = id || properties[0]?.id;
    if (targetId) router.push(`/property-details?id=${targetId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
        <Text style={styles.headerTitle}>My Activity</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabContainer}>
        {(['Requests', 'Viewings', 'Applications'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          const label =
            tab === 'Requests'
              ? `Requests (${requests.length})`
              : tab === 'Viewings'
              ? `Viewings (${viewings.length})`
              : 'Applications (Activity)';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── REQUESTS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Requests' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>
                {userRole === 'landlord' ? 'Active Tenant Requests' : 'My Accommodation Requests'}
              </Text>
              {activityLoading ? (
                <ActivityIndicator style={{ marginVertical: 24 }} color={Brand.terracotta} />
              ) : activityError ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>{activityError}</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => void refreshActivity()}>
                    <Text style={styles.emptyBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : requests.length === 0 ? (
                <View style={styles.emptySection}>
                  <Ionicons name="document-text-outline" size={36} color={Brand.gray300} />
                  <Text style={styles.emptySectionText}>
                    {userRole === 'landlord'
                      ? 'There are no active accommodation requests right now.'
                      : 'No requests yet. Post one to let landlords find you!'}
                  </Text>
                  {userRole === 'tenant' && (
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/post-request')}>
                      <Text style={styles.emptyBtnText}>Post a Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                requests.map(req => (
                  <View key={req.id} style={{ marginBottom: 10 }}>
                    <RequestCard
                      request={req}
                      showContactAction={userRole === 'landlord'}
                      onContact={() => router.push({
                        pathname: '/chat',
                        params: { recipientId: req.userId },
                      })}
                    />
                    {userRole === 'tenant' && req.status !== 'closed' && (
                      <View style={styles.requestActions}>
                        {req.status === 'active' ? (
                          <TouchableOpacity
                            style={styles.requestAction}
                            onPress={() => void changeRequestStatus(req.id, 'paused')}
                          >
                            <Text style={styles.requestActionText}>Pause request</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.requestAction}
                            onPress={() => void changeRequestStatus(req.id, 'active')}
                          >
                            <Text style={styles.requestActionText}>Reactivate request</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.requestAction, styles.closeRequestAction]}
                          onPress={() => Alert.alert('Close request?', 'Landlords will no longer see this request.', [
                            { text: 'Keep open', style: 'cancel' },
                            { text: 'Close request', style: 'destructive', onPress: () => void changeRequestStatus(req.id, 'closed') },
                          ])}
                        >
                          <Text style={[styles.requestActionText, { color: Brand.error }]}>Close request</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Recent saved properties */}
            {savedProperties.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeaderTitle}>Saved Properties</Text>
                {savedProperties.slice(0, 2).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.savedCard, { marginBottom: 10 }]}
                    onPress={() => openProp(p.id)}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{ uri: p.images[0] }}
                      style={styles.cardThumb}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.cardLocation}>{p.suburb}, {p.city}</Text>
                      <Text style={styles.cardPrice}>${p.price}/month</Text>
                    </View>
                    <View style={styles.savedPill}>
                      <Text style={styles.savedPillText}>Saved</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── VIEWINGS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Viewings' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>
              {userRole === 'landlord' ? 'Viewing Requests' : 'Upcoming Viewings'}
            </Text>
            {activityLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={Brand.terracotta} />
            ) : activityError ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>{activityError}</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => void refreshActivity()}>
                  <Text style={styles.emptyBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : viewings.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="calendar-outline" size={36} color={Brand.gray300} />
                <Text style={styles.emptySectionText}>
                  {userRole === 'landlord' ? 'No viewing requests for your listings yet.' : 'No viewings scheduled yet.'}
                </Text>
                {userRole === 'tenant' && (
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/explore')}>
                    <Text style={styles.emptyBtnText}>Find Properties</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              viewings.map(viewing => (
                <View
                  key={viewing.id}
                  style={[
                    styles.viewingItem,
                    viewing.id === viewingId && styles.viewingItemHighlighted,
                  ]}
                >
                  <ViewingCard
                    viewing={viewing}
                    role={userRole}
                    onPressProperty={() => openProp(viewing.propertyId)}
                    onConfirm={() => void changeStatus(viewing.id, 'confirmed')}
                    onDecline={() => void changeStatus(viewing.id, 'rejected')}
                    onComplete={() => void changeStatus(viewing.id, 'completed')}
                    onCancel={() => Alert.alert('Cancel viewing?', 'This cannot be undone.', [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Cancel viewing', style: 'destructive', onPress: () => void changeStatus(viewing.id, 'cancelled') },
                    ])}
                  />
                </View>
              ))
            )}
          </View>
        )}

        {/* ── APPLICATIONS TAB ─────────────────────────────────────────── */}
        {activeTab === 'Applications' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Recent Activity & Inquiries</Text>
            {viewings.length === 0 && conversations.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="time-outline" size={36} color={Brand.gray300} />
                <Text style={styles.emptySectionText}>
                  No recent activity yet. Properties you view, enquire about, or save will appear here.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/explore')}>
                  <Text style={styles.emptyBtnText}>Browse Properties</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {viewings.slice(0, 5).map(v => (
                  <TouchableOpacity
                    key={`act-view-${v.id}`}
                    style={styles.savedCard}
                    activeOpacity={0.8}
                    onPress={() => openProp(v.propertyId)}
                  >
                    <View style={styles.cardIconBox}>
                      <Ionicons name="calendar" size={18} color={Brand.terracotta} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        Viewing: {v.propertyTitle || 'Property Viewing'}
                      </Text>
                      <Text style={styles.cardLocation}>
                        {v.date} at {v.time} • {v.attendees} {v.attendees === 1 ? 'attendee' : 'attendees'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.savedPill,
                        v.status === 'confirmed'
                          ? { backgroundColor: '#D1FAE5' }
                          : v.status === 'rejected' || v.status === 'cancelled'
                          ? styles.cancelledPill
                          : styles.pendingPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.savedPillText,
                          v.status === 'confirmed'
                            ? { color: '#059669' }
                            : v.status === 'rejected' || v.status === 'cancelled'
                            ? styles.cancelledPillText
                            : styles.pendingPillText,
                        ]}
                      >
                        {v.status.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {conversations.slice(0, 5).map(c => (
                  <TouchableOpacity
                    key={`act-conv-${c.id}`}
                    style={styles.savedCard}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/chat',
                        params: { conversationId: c.id },
                      })
                    }
                  >
                    <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#4F46E5" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        Inquiry: {c.participantName}
                      </Text>
                      <Text style={styles.cardLocation} numberOfLines={1}>
                        {c.lastMessage || 'Conversation started'}
                      </Text>
                    </View>
                    {c.unreadCount > 0 ? (
                      <View style={[styles.savedPill, { backgroundColor: Brand.terracotta }]}>
                        <Text style={[styles.savedPillText, { color: Brand.white }]}>
                          {c.unreadCount} NEW
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.savedPill, { backgroundColor: Brand.gray100 }]}>
                        <Text style={[styles.savedPillText, { color: Brand.gray600 }]}>
                          CHAT
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.gray300,
    backgroundColor: Brand.white,
  },
  tabButtonActive: {
    borderColor: Brand.terracotta,
    backgroundColor: Brand.terracotta + '12',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.navy,
  },
  tabButtonTextActive: {
    color: Brand.terracotta,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 10,
  },
  viewingItem: { borderRadius: 14, marginBottom: 10 },
  viewingItemHighlighted: {
    borderWidth: 2,
    borderColor: Brand.terracotta,
    padding: 3,
    backgroundColor: Brand.terracotta + '12',
  },
  requestCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: -6,
    marginBottom: 12,
  },
  requestAction: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Brand.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  closeRequestAction: { borderColor: Brand.errorLight },
  requestActionText: { color: Brand.navy, fontSize: 12, fontWeight: '700' },
  requestCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 2,
  },
  requestSubtitle: {
    fontSize: 12,
    color: Brand.gray600,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 11,
    color: Brand.gray400,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 10,
    gap: 12,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.terracotta + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: Brand.gray500,
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.terracotta,
  },
  viewingTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.navy,
  },
  recentDateText: {
    fontSize: 11,
    color: Brand.gray400,
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
  savedPill: {
    backgroundColor: Brand.terracotta + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savedPillText: {
    color: Brand.terracotta,
    fontSize: 10,
    fontWeight: '700',
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingPillText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  cancelledPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cancelledPillText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
});
