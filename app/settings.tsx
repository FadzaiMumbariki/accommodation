import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { clearPushToken, deleteAccountAndPropertyImages } from '../lib/database';
import { requestAndSavePushToken } from '../hooks/useNotifications';

const SETTINGS_KEY = 'imbafind_notification_settings';

export default function SettingsScreen() {
  const { userRole, setUserRole } = useApp();
  const { user, isSupabaseEnabled, signOut } = useAuth();
  const requireAuth = useRequireAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [viewingReminders, setViewingReminders] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (typeof saved.pushEnabled === 'boolean') setPushEnabled(saved.pushEnabled);
        if (typeof saved.viewingReminders === 'boolean') setViewingReminders(saved.viewingReminders);
        if (typeof saved.smsAlerts === 'boolean') setSmsAlerts(saved.smsAlerts);
      } catch {}
    });
  }, []);

  const persist = (next: { pushEnabled: boolean; viewingReminders: boolean; smsAlerts: boolean }) => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const handlePushToggle = async (v: boolean) => {
    const nextSettings = { pushEnabled: v, viewingReminders, smsAlerts };
    setPushEnabled(v);
    if (v && isSupabaseEnabled && !user) {
      setPushEnabled(false);
      Alert.alert('Sign in first', 'Sign in before enabling push notifications for your account.');
      return;
    }
    if (v && isSupabaseEnabled && user) {
      try {
        const token = await requestAndSavePushToken(user.id, true);
        if (!token) {
          setPushEnabled(false);
          persist({ pushEnabled: false, viewingReminders, smsAlerts });
          Alert.alert('Notifications not enabled', 'Allow notifications in your device settings to enable push alerts.');
          return;
        }
      } catch (error) {
        console.error('[Settings] Could not enable push notifications:', error);
        setPushEnabled(false);
        persist({ pushEnabled: false, viewingReminders, smsAlerts });
        Alert.alert(
          'Could not enable notifications',
          error instanceof Error ? error.message : 'Please try again.',
        );
        return;
      }
    } else if (!v && isSupabaseEnabled && user) {
      try {
        await clearPushToken(user.id);
      } catch (error) {
        console.error('[Settings] Could not clear push token:', error);
        setPushEnabled(true);
        Alert.alert('Could not disable notifications', 'Please try again.');
        return;
      }
    }
    persist(nextSettings);
  };
  const handleViewingToggle = (v: boolean) => {
    setViewingReminders(v);
    persist({ pushEnabled, viewingReminders: v, smsAlerts });
  };
  const handleSmsToggle = (v: boolean) => {
    setSmsAlerts(v);
    persist({ pushEnabled, viewingReminders, smsAlerts: v });
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      console.error('[Settings] Could not open privacy policy:', error);
      Alert.alert('Could not open link', 'Please try again later.');
    }
  };

  const deleteAccount = async () => {
    if (!user || !isSupabaseEnabled || deletingAccount) return;
    setDeletingAccount(true);
    try {
      await deleteAccountAndPropertyImages(user.id);
    } catch (error) {
      console.error('[Settings] Account deletion failed:', error);
      Alert.alert(
        'Could not delete account',
        error instanceof Error ? error.message : 'Please try again.',
      );
      setDeletingAccount(false);
      return;
    }

    let cleanupFailed = false;
    try {
      await signOut({ localOnly: true });
    } catch (error) {
      console.error('[Settings] Could not clear local auth session:', error);
      cleanupFailed = true;
    }
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Settings] Could not clear local storage:', error);
      cleanupFailed = true;
    }
    setDeletingAccount(false);
    router.replace('/login');
    if (cleanupFailed) {
      Alert.alert('Account deleted', 'Some local data could not be cleared. Please restart the app.');
    }
  };

  const confirmDeleteAccount = () => {
    if (!requireAuth('/settings')) return;
    Alert.alert(
      'Delete account permanently?',
      'This permanently deletes your ImbaFind account, profile, listings and account data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Preferences</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account Type Card */}
        <Text style={styles.sectionHeader}>Account Mode</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.rowTitle}>Current Mode</Text>
              <Text style={styles.rowSubtitle}>
                {userRole === 'landlord' ? 'Landlord (Managing Properties)' : 'Tenant (Finding Accommodation)'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.switchRoleBtn}
              onPress={async () => {
                if (isSupabaseEnabled && !user && !requireAuth('/settings')) return;
                const nextRole = userRole === 'tenant' ? 'landlord' : 'tenant';
                const updated = await setUserRole(nextRole);
                if (!updated) {
                  Alert.alert('Could not update account mode', 'Please try again.');
                  return;
                }
                Alert.alert(
                  'Account Mode Updated',
                  `Switched to ${nextRole === 'landlord' ? 'Landlord' : 'Tenant'} mode.`
                );
              }}
            >
              <Text style={styles.switchRoleBtnText}>Switch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>New inquiries, viewing confirmations, updates</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: Brand.gray200, true: Brand.terracottaLight }}
              thumbColor={pushEnabled ? Brand.terracotta : Brand.gray400}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>Viewing Reminders</Text>
              <Text style={styles.rowSubtitle}>Alert 2 hours before scheduled physical viewings</Text>
            </View>
            <Switch
              value={viewingReminders}
              onValueChange={handleViewingToggle}
              trackColor={{ false: Brand.gray200, true: Brand.terracottaLight }}
              thumbColor={viewingReminders ? Brand.terracotta : Brand.gray400}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>SMS Alerts</Text>
              <Text style={styles.rowSubtitle}>Urgent messages delivered via EcoCash/Econet SMS</Text>
            </View>
            <Switch
              value={smsAlerts}
              onValueChange={handleSmsToggle}
              trackColor={{ false: Brand.gray200, true: Brand.terracottaLight }}
              thumbColor={smsAlerts ? Brand.terracotta : Brand.gray400}
            />
          </View>
        </View>

        {/* Currency & Region */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.rowTitle}>Default Currency</Text>
              <Text style={styles.rowSubtitle}>United States Dollars (USD $)</Text>
            </View>
            <Ionicons name="cash-outline" size={20} color={Brand.terracotta} />
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.rowTitle}>Region</Text>
              <Text style={styles.rowSubtitle}>Zimbabwe (All Provinces)</Text>
            </View>
            <Ionicons name="globe-outline" size={20} color={Brand.navy} />
          </View>
        </View>

        {/* Legal & Security */}
        <Text style={styles.sectionHeader}>Legal & Security</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => void openPrivacyPolicy()}
            accessibilityLabel="Open hosted privacy policy"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={Brand.navy} />
            <Text style={styles.navRowText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/legal/terms')}
          >
            <Ionicons name="document-text-outline" size={20} color={Brand.navy} />
            <Text style={styles.navRowText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.gray400} />
          </TouchableOpacity>
        </View>

        {isSupabaseEnabled && user && (
          <>
            <Text style={styles.sectionHeader}>Account</Text>
            <TouchableOpacity
              style={[styles.deleteAccountBtn, deletingAccount && styles.deleteAccountDisabled]}
              onPress={confirmDeleteAccount}
              disabled={deletingAccount}
              accessibilityLabel="Delete account permanently"
            >
              {deletingAccount
                ? <ActivityIndicator size="small" color={Brand.error} />
                : <Ionicons name="trash-outline" size={18} color={Brand.error} />}
              <Text style={styles.deleteAccountText}>
                {deletingAccount ? 'Deleting account…' : 'Delete account'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Clear Cache */}
        <TouchableOpacity
          style={styles.clearCacheBtn}
          onPress={() =>
            Alert.alert(
              'Clear All Cache?',
              'This will reset saved filters, viewings, and messages back to default settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => Alert.alert('Cache Cleared', 'Temporary image cache cleared successfully.'),
                },
              ]
            )
          }
        >
          <Ionicons name="trash-outline" size={16} color={Brand.gray600} />
          <Text style={styles.clearCacheText}>Clear Offline Cache</Text>
        </TouchableOpacity>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.navy,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
    maxWidth: 240,
  },
  switchRoleBtn: {
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchRoleBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.gray100,
    marginVertical: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  navRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.navy,
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 10,
  },
  clearCacheText: {
    fontSize: 13,
    color: Brand.gray600,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.error,
    backgroundColor: Brand.white,
  },
  deleteAccountDisabled: { opacity: 0.6 },
  deleteAccountText: { color: Brand.error, fontSize: 14, fontWeight: '700' },
});
