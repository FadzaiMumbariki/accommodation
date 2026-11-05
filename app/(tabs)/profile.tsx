import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Brand } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { PRIVACY_POLICY_URL } from '../../constants/links';
import { ReportDialog } from '../../components/common/ReportDialog';
import { insertReport } from '../../lib/database';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { WebFooter } from '../../components/navigation/WebFooter';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';

function ProfileScreen() {
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const { userName, userRole, setUserRole, isAdmin } = useApp();
  const { signOut, user } = useAuth();
  const requireAuth = useRequireAuth();

  const { isMobile } = useResponsive();

  const switchRole = async () => {
    if (!requireAuth('/(tabs)/profile')) return;
    const newRole = userRole === 'tenant' ? 'landlord' : 'tenant';
    const updated = await setUserRole(newRole);
    if (!updated) {
      Alert.alert('Could not update account mode', 'Please try again.');
      return;
    }
    Alert.alert(
      'Account Switched',
      `You are now in ${newRole === 'tenant' ? 'Tenant (Home Seeker)' : 'Landlord (Property Owner)'} mode.`,
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of ImbaFind?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL).catch((error) => {
      console.error('[Profile] Could not open privacy policy:', error);
      Alert.alert('Could not open link', 'Please try again later.');
    });
  };

  const handleReportProblem = async (reason: string, details: string): Promise<boolean> => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a report.');
      return false;
    }
    setReportSubmitting(true);
    try {
      await insertReport({
        reporterId: user.id,
        reportedUserId: user.id, // report against own account as a general problem report
        reason,
        details,
      });
      Alert.alert('Report submitted', 'Thank you — our team will review it shortly.');
      setReportVisible(false);
      return true;
    } catch (error) {
      console.error('[Profile] Report submission failed:', error);
      Alert.alert(
        'Could not submit report',
        error instanceof Error ? error.message : 'Please try again.',
      );
      return false;
    } finally {
      setReportSubmitting(false);
    }
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: 'person-outline' as const,
      onPress: () => router.push('/profile-edit'),
    },
    {
      id: 'activity',
      label: 'My Activity',
      icon: 'flash-outline' as const,
      onPress: () => router.push('/my-activity'),
    },
    {
      id: 'saved',
      label: 'Saved Properties',
      icon: 'heart-outline' as const,
      onPress: () => router.push('/(tabs)/saved'),
    },
    ...(isAdmin
      ? [
          {
            id: 'verifications',
            label: 'Verify Listings & Landlords',
            icon: 'shield-checkmark-outline' as const,
            onPress: () => router.push('/admin-verifications'),
          },
        ]
      : []),
    ...(userRole === 'landlord'
      ? [
          {
            id: 'listings',
            label: 'My Listings',
            icon: 'home-outline' as const,
            onPress: () => router.push('/landlord-dashboard'),
          },
          {
            id: 'add-property',
            label: 'Add Property',
            icon: 'add-circle-outline' as const,
            onPress: () => router.push('/add-property'),
          },
        ]
      : []),
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-outline' as const,
      onPress: () => router.push('/settings'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline' as const,
      onPress: () => router.push('/notifications'),
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      icon: 'lock-closed-outline' as const,
      onPress: openPrivacyPolicy,
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'help-circle-outline' as const,
      onPress: () => router.push('/help'),
    },
    {
      id: 'report',
      label: 'Report a Problem',
      icon: 'warning-outline' as const,
      onPress: () => setReportVisible(true),
    },
    {
      id: 'switch',
      label: `Switch to ${userRole === 'tenant' ? 'Landlord' : 'Tenant'} Mode`,
      icon: 'swap-horizontal-outline' as const,
      onPress: switchRole,
      isSwitch: true,
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: 'log-out-outline' as const,
      onPress: handleLogout,
      isDanger: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[styles.scroll, !isMobile && { paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer maxWidth={760}>
          {/* User Card */}
          <View style={styles.userCard}>
            <Image
              source={{
                uri:
                  user?.user_metadata?.avatar_url ??
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
              }}
              style={styles.userAvatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.user_metadata?.full_name ?? userName ?? 'Fadzai'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email ?? 'tenant@imbafind.co.zw'}
              </Text>
              <View style={styles.roleActionRow}>
                <View
                  style={[
                    styles.roleBadge,
                    userRole === 'landlord' ? styles.roleBadgeLandlord : styles.roleBadgeTenant,
                  ]}
                >
                  <Ionicons
                    name={userRole === 'landlord' ? 'business' : 'person'}
                    size={12}
                    color={Brand.white}
                  />
                  <Text style={styles.roleBadgeText}>
                    {userRole === 'landlord' ? 'Landlord' : 'Tenant'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.quickSwitchBtn}
                  onPress={switchRole}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${userRole === 'landlord' ? 'Tenant' : 'Landlord'} mode`}
                >
                  <Ionicons name="swap-horizontal" size={14} color={Brand.terracotta} />
                  <Text style={styles.quickSwitchBtnText}>
                    Switch to {userRole === 'landlord' ? 'Tenant' : 'Landlord'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.isDanger ? Brand.error : Brand.navy}
                  />
                  <Text style={[styles.menuLabel, item.isDanger && styles.menuLabelDanger]}>
                    {item.label}
                  </Text>
                </View>
                {!item.isDanger && (
                  <Ionicons name="chevron-forward" size={16} color={Brand.gray400} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ResponsiveContainer>
        {!isMobile && <WebFooter />}
      </ScrollView>

      <ReportDialog
        visible={reportVisible}
        title="Report a Problem"
        targetLabel="ImbaFind App"
        submitting={reportSubmitting}
        onCancel={() => setReportVisible(false)}
        onSubmit={handleReportProblem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Brand.white,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 18,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Brand.terracotta,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
  },
  userEmail: {
    fontSize: 12,
    color: Brand.gray400,
    marginTop: 1,
  },
  roleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeLandlord: {
    backgroundColor: Brand.terracotta,
  },
  roleBadgeTenant: {
    backgroundColor: Brand.navy,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.white,
  },
  quickSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.terracotta,
    backgroundColor: Brand.cream,
  },
  quickSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  menuList: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray100,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.navy,
  },
  menuLabelDanger: {
    color: Brand.error,
  },
});

export default function ProfileScreenWithBoundary() {
  return (
    <TabErrorBoundary tabName="Profile">
      <ProfileScreen />
    </TabErrorBoundary>
  );
}
