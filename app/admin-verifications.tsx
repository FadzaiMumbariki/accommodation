import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import {
  fetchProfile,
  fetchVerifiableLandlords,
  fetchVerifiableProperties,
  fetchPendingVerificationRequests,
  getVerificationDocumentSignedUrl,
  reviewVerificationRequest,
  setPropertyVerified,
  setUserVerified,
  type PendingVerificationRequest,
  type VerifiableLandlord,
  type VerifiableProperty,
} from '../lib/database';

type Tab = 'listings' | 'landlords' | 'documents';

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatDocumentType(type: string): string {
  switch (type) {
    case 'national_id':
      return 'National ID';
    case 'passport':
      return 'Passport';
    case 'title_deed':
      return 'Title Deed / Sale Agreement';
    case 'utility_bill':
      return 'Utility / Council Bill';
    case 'management_mandate':
      return 'Management Mandate';
    default:
      return type.replace(/_/g, ' ');
  }
}

export default function AdminVerificationsScreen() {
  const { user, isSupabaseEnabled } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('listings');
  const [properties, setProperties] = useState<VerifiableProperty[]>([]);
  const [landlords, setLandlords] = useState<VerifiableLandlord[]>([]);
  const [documentRequests, setDocumentRequests] = useState<PendingVerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Document review modal state
  const [activeReviewDoc, setActiveReviewDoc] = useState<PendingVerificationRequest | null>(null);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [loadingDocUrl, setLoadingDocUrl] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [props, lands, docs] = await Promise.all([
        fetchVerifiableProperties(),
        fetchVerifiableLandlords(),
        fetchPendingVerificationRequests(),
      ]);
      setProperties(props);
      setLandlords(lands);
      setDocumentRequests(docs);
    } catch (error) {
      console.error('[AdminVerifications] Could not load queue:', error);
      setLoadError(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Confirm the account is an admin before loading the queue.
  useEffect(() => {
    if (!isSupabaseEnabled || !user) {
      // Reset authorization synchronously when there is no real session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(false);
      return;
    }
    let active = true;
    void fetchProfile(user.id)
      .then((profile) => {
        if (!active) return;
        setAuthorized(Boolean(profile?.isAdmin));
      })
      .catch((error) => {
        console.error('[AdminVerifications] Could not verify admin status:', error);
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
    };
  }, [isSupabaseEnabled, user]);

  useEffect(() => {
    // Fetch-on-mount for the verification queue once the account is confirmed admin.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authorized) void load();
  }, [authorized, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleProperty = async (item: VerifiableProperty) => {
    const next = !item.verified;
    setBusyId(item.id);
    try {
      await setPropertyVerified(item.id, next);
      setProperties((prev) => prev.map((p) => (p.id === item.id ? { ...p, verified: next } : p)));
    } catch (error) {
      Alert.alert('Could not update listing', friendlyError(error));
    } finally {
      setBusyId(null);
    }
  };

  const toggleLandlord = async (item: VerifiableLandlord) => {
    const next = !item.verified;
    setBusyId(item.id);
    try {
      await setUserVerified(item.id, next);
      setLandlords((prev) => prev.map((l) => (l.id === item.id ? { ...l, verified: next } : l)));
    } catch (error) {
      Alert.alert('Could not update landlord', friendlyError(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenDocModal = async (item: PendingVerificationRequest) => {
    setActiveReviewDoc(item);
    setSignedDocUrl(null);
    setAdminNotes('');
    setLoadingDocUrl(true);
    try {
      const url = await getVerificationDocumentSignedUrl(item.documentUrl, 1800);
      setSignedDocUrl(url);
    } catch {
      Alert.alert('Error', 'Could not generate secure signed URL for this document.');
    } finally {
      setLoadingDocUrl(false);
    }
  };

  const handleReviewDecision = async (decision: 'approved' | 'rejected') => {
    if (!activeReviewDoc) return;
    setBusyId(activeReviewDoc.id);
    try {
      await reviewVerificationRequest({
        requestId: activeReviewDoc.id,
        userId: activeReviewDoc.userId,
        decision,
        adminNotes: adminNotes.trim() || undefined,
        documentUrl: activeReviewDoc.documentUrl,
      });

      // Update state
      setDocumentRequests((prev) => prev.filter((r) => r.id !== activeReviewDoc.id));
      if (decision === 'approved') {
        setLandlords((prev) =>
          prev.map((l) => (l.id === activeReviewDoc.userId ? { ...l, verified: true } : l)),
        );
      }
      setActiveReviewDoc(null);
      setSignedDocUrl(null);
      setAdminNotes('');
      Alert.alert(
        decision === 'approved' ? 'Landlord Approved' : 'Request Rejected',
        `The document was vetted and permanently deleted from secure storage.`,
      );
    } catch (err) {
      Alert.alert('Action Failed', friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (authorized === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={Brand.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  if (!authorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {header('Verification')}
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={44} color={Brand.gray300} />
          <Text style={styles.emptyTitle}>Admin access required</Text>
          <Text style={styles.emptyDesc}>This area is only for ImbaFind verification staff.</Text>
          <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: VerifiableProperty }) => (
    <View style={styles.card}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumb}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="home-outline" size={22} color={Brand.gray400} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {item.suburb}, {item.city}
        </Text>
        <Text style={styles.cardMeta}>{item.landlordName ?? 'Unknown landlord'}</Text>
        {item.verified && (
          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={12} color={Brand.success} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          item.verified && styles.toggleBtnUnverify,
          busyId === item.id && styles.toggleBtnDisabled,
        ]}
        onPress={() => void toggleProperty(item)}
        disabled={busyId === item.id}
        accessibilityLabel={item.verified ? 'Remove verified badge' : 'Mark listing verified'}
      >
        {busyId === item.id ? (
          <ActivityIndicator size="small" color={Brand.white} />
        ) : (
          <Text style={styles.toggleBtnText}>{item.verified ? 'Unverify' : 'Verify'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLandlord = ({ item }: { item: VerifiableLandlord }) => (
    <View style={styles.card}>
      {item.avatarUrl ? (
        <Image
          source={{ uri: item.avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.avatar, styles.thumbPlaceholder]}>
          <Text style={styles.avatarInitial}>{(item.fullName ?? 'L')[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.fullName ?? 'Unnamed landlord'}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.email ?? item.phone ?? '—'}
        </Text>
        {item.verified && (
          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={12} color={Brand.success} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          item.verified && styles.toggleBtnUnverify,
          busyId === item.id && styles.toggleBtnDisabled,
        ]}
        onPress={() => void toggleLandlord(item)}
        disabled={busyId === item.id}
        accessibilityLabel={item.verified ? 'Remove verified badge' : 'Mark landlord verified'}
      >
        {busyId === item.id ? (
          <ActivityIndicator size="small" color={Brand.white} />
        ) : (
          <Text style={styles.toggleBtnText}>{item.verified ? 'Unverify' : 'Verify'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDocRequest = ({ item }: { item: PendingVerificationRequest }) => (
    <View style={styles.docCard}>
      <View style={styles.docCardHeader}>
        <View style={styles.docBadge}>
          <Ionicons name="document-text" size={14} color={Brand.navy} />
          <Text style={styles.docBadgeText}>{formatDocumentType(item.documentType)}</Text>
        </View>
        <Text style={styles.docCardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.docCardBody}>
        <Text style={styles.docApplicantName}>{item.applicantName ?? 'Unnamed applicant'}</Text>
        <Text style={styles.docApplicantContact}>
          {item.applicantPhone ?? item.applicantEmail ?? 'No direct contact'}
        </Text>
        {item.documentNotes && (
          <Text style={styles.docApplicantNotes} numberOfLines={2}>
            &ldquo;{item.documentNotes}&rdquo;
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.reviewDocBtn}
        onPress={() => void handleOpenDocModal(item)}
        accessibilityLabel={`Review document for ${item.applicantName ?? 'applicant'}`}
      >
        <Ionicons name="eye-outline" size={16} color={Brand.white} />
        <Text style={styles.reviewDocBtnText}>Review Document</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {header('Verification')}

      <View style={styles.tabRow}>
        <TabButton
          label="Listings"
          active={tab === 'listings'}
          onPress={() => setTab('listings')}
        />
        <TabButton
          label="Landlords"
          active={tab === 'landlords'}
          onPress={() => setTab('landlords')}
        />
        <TabButton
          label={`ID Docs (${documentRequests.length})`}
          active={tab === 'documents'}
          onPress={() => setTab('documents')}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Brand.terracotta} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.emptyDesc}>{loadError}</Text>
          <TouchableOpacity style={styles.backPill} onPress={() => void load()}>
            <Text style={styles.backPillText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tab === 'listings' ? (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Brand.terracotta}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyDesc}>Nothing to verify yet.</Text>
            </View>
          }
        />
      ) : tab === 'landlords' ? (
        <FlatList
          data={landlords}
          keyExtractor={(item) => item.id}
          renderItem={renderLandlord}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Brand.terracotta}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyDesc}>Nothing to verify yet.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={documentRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderDocRequest}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Brand.terracotta}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="shield-checkmark-outline" size={40} color={Brand.gray300} />
              <Text style={[styles.emptyDesc, { marginTop: 8 }]}>
                No pending identity documents to review. All caught up!
              </Text>
            </View>
          }
        />
      )}

      {/* Document Review Modal */}
      <Modal
        visible={Boolean(activeReviewDoc)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveReviewDoc(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Document Review</Text>
            <TouchableOpacity
              onPress={() => setActiveReviewDoc(null)}
              style={styles.modalCloseBtn}
              accessibilityLabel="Close review modal"
            >
              <Ionicons name="close" size={22} color={Brand.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {activeReviewDoc && (
              <>
                <View style={styles.modalApplicantInfo}>
                  <Text style={styles.modalApplicantName}>
                    {activeReviewDoc.applicantName ?? 'Applicant'}
                  </Text>
                  <Text style={styles.modalApplicantContact}>
                    {activeReviewDoc.applicantPhone ??
                      activeReviewDoc.applicantEmail ??
                      'No contact provided'}
                  </Text>
                  <Text style={styles.modalDocType}>
                    Document: {formatDocumentType(activeReviewDoc.documentType)}
                  </Text>
                  {activeReviewDoc.documentNotes && (
                    <Text style={styles.modalNotes}>
                      Applicant notes: &ldquo;{activeReviewDoc.documentNotes}&rdquo;
                    </Text>
                  )}
                </View>

                {/* Secure Document Preview */}
                <View style={styles.modalImageContainer}>
                  {loadingDocUrl ? (
                    <View style={styles.modalImageLoader}>
                      <ActivityIndicator size="large" color={Brand.terracotta} />
                      <Text style={styles.modalImageLoaderText}>
                        Generating secure temporary signed URL...
                      </Text>
                    </View>
                  ) : signedDocUrl ? (
                    <Image
                      source={{ uri: signedDocUrl }}
                      style={styles.modalDocImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.modalImageLoader}>
                      <Ionicons name="alert-circle-outline" size={36} color={Brand.error} />
                      <Text style={styles.modalImageLoaderText}>
                        Could not load document preview. File may have been removed.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Privacy disclaimer */}
                <View style={styles.modalPrivacyNotice}>
                  <Ionicons name="lock-closed" size={14} color={Brand.gray500} />
                  <Text style={styles.modalPrivacyText}>
                    Security Policy: The document will be permanently deleted from private storage
                    as soon as a decision is recorded.
                  </Text>
                </View>

                {/* Admin notes input */}
                <Text style={styles.modalNotesLabel}>Admin Notes (Optional)</Text>
                <TextInput
                  style={styles.modalNotesInput}
                  placeholder="E.g. ID verified, details match national registry..."
                  placeholderTextColor={Brand.gray400}
                  multiline
                  numberOfLines={2}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                />

                {/* Decision Actions */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalActionBtn,
                      styles.rejectBtn,
                      busyId === activeReviewDoc.id && styles.btnDisabled,
                    ]}
                    onPress={() => void handleReviewDecision('rejected')}
                    disabled={busyId === activeReviewDoc.id}
                  >
                    {busyId === activeReviewDoc.id ? (
                      <ActivityIndicator size="small" color={Brand.white} />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={18} color={Brand.white} />
                        <Text style={styles.modalActionBtnText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalActionBtn,
                      styles.approveBtn,
                      busyId === activeReviewDoc.id && styles.btnDisabled,
                    ]}
                    onPress={() => void handleReviewDecision('approved')}
                    disabled={busyId === activeReviewDoc.id}
                  >
                    {busyId === activeReviewDoc.id ? (
                      <ActivityIndicator size="small" color={Brand.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color={Brand.white} />
                        <Text style={styles.modalActionBtnText}>Approve &amp; Verify</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function header(title: string) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color={Brand.navy} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
    backgroundColor: Brand.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Brand.navy },
  tabRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  tabBtnActive: { backgroundColor: Brand.navy, borderColor: Brand.navy },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: Brand.gray500 },
  tabBtnTextActive: { color: Brand.white },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 12,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  thumb: { width: 54, height: 54, borderRadius: 10 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  thumbPlaceholder: {
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: Brand.navy },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Brand.navy },
  cardMeta: { fontSize: 12, color: Brand.gray400, marginTop: 2 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  verifiedTagText: { fontSize: 11, fontWeight: '700', color: Brand.success },
  toggleBtn: {
    backgroundColor: Brand.terracotta,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 76,
    alignItems: 'center',
  },
  toggleBtnUnverify: { backgroundColor: Brand.gray500 },
  toggleBtnDisabled: { opacity: 0.7 },
  toggleBtnText: { color: Brand.white, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Brand.navy },
  emptyDesc: { fontSize: 13, color: Brand.gray400, textAlign: 'center', lineHeight: 19 },
  backPill: {
    backgroundColor: Brand.terracotta,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backPillText: { color: Brand.white, fontSize: 13, fontWeight: '700' },
  // Document queue card styles
  docCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.navy,
  },
  docCardDate: {
    fontSize: 11,
    color: Brand.gray400,
  },
  docCardBody: {
    marginBottom: 12,
  },
  docApplicantName: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
  },
  docApplicantContact: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  docApplicantNotes: {
    fontSize: 12,
    color: Brand.navy,
    fontStyle: 'italic',
    marginTop: 6,
    backgroundColor: Brand.cream,
    padding: 8,
    borderRadius: 8,
  },
  reviewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.navy,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reviewDocBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  modalApplicantInfo: {
    backgroundColor: Brand.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  modalApplicantName: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
  },
  modalApplicantContact: {
    fontSize: 13,
    color: Brand.gray500,
    marginTop: 3,
  },
  modalDocType: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.terracotta,
    marginTop: 8,
  },
  modalNotes: {
    fontSize: 12,
    color: Brand.navy,
    marginTop: 6,
    backgroundColor: Brand.gray100,
    padding: 8,
    borderRadius: 8,
  },
  modalImageContainer: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  modalImageLoaderText: {
    fontSize: 12,
    color: Brand.gray500,
    textAlign: 'center',
  },
  modalDocImage: {
    width: '100%',
    height: 340,
    backgroundColor: '#000',
  },
  modalPrivacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalPrivacyText: {
    flex: 1,
    fontSize: 11,
    color: Brand.gray500,
    lineHeight: 16,
  },
  modalNotesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 6,
  },
  modalNotesInput: {
    backgroundColor: Brand.white,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Brand.navy,
    borderWidth: 1,
    borderColor: Brand.gray200,
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 60,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectBtn: {
    backgroundColor: Brand.error,
  },
  approveBtn: {
    backgroundColor: Brand.success,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalActionBtnText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
