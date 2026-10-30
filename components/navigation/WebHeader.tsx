import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Brand } from '../../constants/Colors';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface WebHeaderProps {
  onSearchPress?: () => void;
}

export const WebHeader: React.FC<WebHeaderProps> = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { userName } = useApp();
  const { conversations } = useChat();

  const unreadCount = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;

  const isActive = (route: string) => {
    if (route === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index')) {
      return true;
    }
    return pathname.startsWith(route);
  };

  const navItems = [
    { label: 'Home', route: '/(tabs)', icon: 'home-outline', activeIcon: 'home' as const },
    { label: 'Explore', route: '/(tabs)/explore', icon: 'search-outline', activeIcon: 'search' as const },
    { label: 'AI Assistant', route: '/ai-chat', icon: 'sparkles-outline', activeIcon: 'sparkles' as const, highlight: true },
    { label: 'Saved', route: '/(tabs)/saved', icon: 'heart-outline', activeIcon: 'heart' as const },
    {
      label: 'Messages',
      route: '/(tabs)/messages',
      icon: 'chatbubble-outline',
      activeIcon: 'chatbubble' as const,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.headerContent}>
        {/* Brand Logo */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => handleNav('/(tabs)')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="ImbaFind Home"
        >
          <View style={styles.logoBadge}>
            <Ionicons name="home" size={20} color={Brand.white} />
          </View>
          <View>
            <View style={styles.logoTitleRow}>
              <Text style={styles.logoText}>Imba</Text>
              <Text style={[styles.logoText, { color: Brand.terracotta }]}>Find</Text>
            </View>
            <Text style={styles.logoSubText}>Zimbabwe Accommodation</Text>
          </View>
        </TouchableOpacity>

        {/* Center Desktop Navigation */}
        <View style={styles.navLinksRow}>
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.navItem,
                  active && styles.navItemActive,
                  item.highlight && styles.navItemAi,
                ]}
                onPress={() => handleNav(item.route)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons
                  name={active ? item.activeIcon : (item.icon as any)}
                  size={17}
                  color={
                    item.highlight
                      ? active
                        ? Brand.white
                        : Brand.terracotta
                      : active
                      ? Brand.terracotta
                      : Brand.navy
                  }
                />
                <Text
                  style={[
                    styles.navItemText,
                    active && styles.navItemTextActive,
                    item.highlight && { color: active ? Brand.white : Brand.terracotta, fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </Text>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right Desktop Actions */}
        <View style={styles.rightActionsRow}>
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => handleNav('/add-property')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="List a Property"
          >
            <Ionicons name="add-circle" size={17} color={Brand.white} />
            <Text style={styles.postBtnText}>List Property</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleNav('/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={Brand.navy} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => handleNav(user ? '/(tabs)/profile' : '/login')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Profile menu"
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={15} color={Brand.terracotta} />
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName ? userName.split(' ')[0] : user ? 'Account' : 'Sign In'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={Brand.gray400} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
    width: '100%',
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  logoTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.navy,
    letterSpacing: -0.5,
  },
  logoSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: Brand.gray500,
    letterSpacing: 0.3,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: Brand.terracotta + '15',
  },
  navItemAi: {
    backgroundColor: Brand.terracotta + '10',
    borderWidth: 1,
    borderColor: Brand.terracotta + '30',
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.navy,
  },
  navItemTextActive: {
    color: Brand.terracotta,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: Brand.terracotta,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  badgeText: {
    color: Brand.white,
    fontSize: 10,
    fontWeight: '700',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  postBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.navy,
    maxWidth: 90,
  },
});
