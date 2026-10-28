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
  setPropertyVerified,
  setUserVerified,
  type VerifiableLandlord,
  type VerifiableProperty,
} from '../lib/database';

type Tab = 'listings' | 'landlords';

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function AdminVerificationsScreen() {
  const { user, isSupabaseEnabled } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('listings');
  const [properties, setProperties] = useState<VerifiableProperty[]>([]);
  const [landlords, setLandlords] = useState<VerifiableLandlord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [props, lands] = await Promise.all([
        fetchVerifiableProperties(),
        fetchVerifiableLandlords(),
      ]);
      setProperties(props);
      setLandlords(lands);
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
      .then(profile => {
        if (!active) return;
        setAuthorized(Boolean(profile?.isAdmin));
      })
      .catch(error => {
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
      setProperties(prev => prev.map(p => (p.id === item.id ? { ...p, verified: next } : p)));
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
      setLandlords(prev => prev.map(l => (l.id === item.id ? { ...l, verified: next } : l)));
    } catch (error) {
      Alert.alert('Could not update landlord', friendlyError(error));
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
          <Text style={styles.emptyDesc}>
            This area is only for ImbaFind verification staff.
          </Text>
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
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="home-outline" size={22} color={Brand.gray400} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta}>{item.suburb}, {item.city}</Text>
        <Text style={styles.cardMeta}>{item.landlordName ?? 'Unknown landlord'}</Text>
        {item.verified && (
          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={12} color={Brand.success} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, item.verified && styles.toggleBtnUnverify, busyId === item.id && styles.toggleBtnDisabled]}
        onPress={() => void toggleProperty(item)}
        disabled={busyId === item.id}
        accessibilityLabel={item.verified ? 'Remove verified badge' : 'Mark listing verified'}
      >
        {busyId === item.id ? (
          <ActivityIndicator size="small" color={Brand.white} />
        ) : (
          <Text style={styles.toggleBtnText}>
            {item.verified ? 'Unverify' : 'Verify'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLandlord = ({ item }: { item: VerifiableLandlord }) => (
    <View style={styles.card}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.avatar, styles.thumbPlaceholder]}>
          <Text style={styles.avatarInitial}>{(item.fullName ?? 'L')[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.fullName ?? 'Unnamed landlord'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{item.email ?? item.phone ?? '—'}</Text>
        {item.verified && (
          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={12} color={Brand.success} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, item.verified && styles.toggleBtnUnverify, busyId === item.id && styles.toggleBtnDisabled]}
        onPress={() => void toggleLandlord(item)}
        disabled={busyId === item.id}
        accessibilityLabel={item.verified ? 'Remove verified badge' : 'Mark landlord verified'}
      >
        {busyId === item.id ? (
          <ActivityIndicator size="small" color={Brand.white} />
        ) : (
          <Text style={styles.toggleBtnText}>
            {item.verified ? 'Unverify' : 'Verify'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {header('Verification')}

      <View style={styles.tabRow}>
        <TabButton label="Listings" active={tab === 'listings'} onPress={() => setTab('listings')} />
        <TabButton label="Landlords" active={tab === 'landlords'} onPress={() => setTab('landlords')} />
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
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Brand.terracotta} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyDesc}>Nothing to verify yet.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={landlords}
          keyExtractor={item => item.id}
          renderItem={renderLandlord}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Brand.terracotta} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyDesc}>Nothing to verify yet.</Text>
            </View>
          }
        />
      )}
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

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  tabBtnActive: { backgroundColor: Brand.navy, borderColor: Brand.navy },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: Brand.gray500 },
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
  backPill: { backgroundColor: Brand.terracotta, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  backPillText: { color: Brand.white, fontSize: 13, fontWeight: '700' },
});
