import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';

interface NotificationItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

function buildNotifications(
  conversations: ReturnType<typeof useApp>['conversations'],
  viewings: ReturnType<typeof useApp>['viewings'],
): NotificationItem[] {
  const items: NotificationItem[] = [];

  // Unread messages
  const unreadConvos = conversations.filter(c => c.unreadCount > 0);
  unreadConvos.forEach(c => {
    items.push({
      id: `msg-${c.id}`,
      icon: 'chatbubble-outline',
      iconColor: Brand.terracotta,
      title: `New message from ${c.participantName}`,
      body: c.lastMessage
        ? c.lastMessage.length > 60
          ? `${c.lastMessage.slice(0, 60)}…`
          : c.lastMessage
        : 'New message',
      time: c.lastMessageTime,
      read: false,
    });
  });

  // Pending viewings
  const pendingViewings = viewings.filter(v => v.status === 'pending');
  pendingViewings.forEach(v => {
    items.push({
      id: `viewing-${v.id}`,
      icon: 'calendar-outline',
      iconColor: Brand.info,
      title: 'Viewing request pending',
      body: `${v.propertyTitle} — ${v.date} at ${v.time}`,
      time: v.createdAt,
      read: false,
    });
  });

  // Confirmed viewings
  const confirmedViewings = viewings.filter(v => v.status === 'confirmed');
  confirmedViewings.forEach(v => {
    items.push({
      id: `confirmed-${v.id}`,
      icon: 'checkmark-circle-outline',
      iconColor: Brand.success,
      title: 'Viewing confirmed!',
      body: `${v.propertyTitle} — ${v.date} at ${v.time}`,
      time: v.createdAt,
      read: true,
    });
  });

  // Sort newest first (approximate)
  items.sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    return b.time.localeCompare(a.time);
  });

  return items;
}

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const { conversations, viewings } = useApp();
  const notifications = buildNotifications(conversations, viewings);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => {
        // Navigate to relevant screen
        if (item.id.startsWith('msg-')) {
          router.push('/(tabs)/messages');
        } else if (item.id.startsWith('viewing-') || item.id.startsWith('confirmed-')) {
          router.push('/my-activity');
        }
      }}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.iconColor + '18' }]}>
        <Ionicons name={item.icon} size={22} color={item.iconColor} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemTime}>{formatRelativeTime(item.time)}</Text>
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.white} />

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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={56} color={Brand.gray300} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyBody}>
            You have no notifications right now.{'\n'}Viewing updates and messages will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Brand.navy },
  list: { paddingVertical: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.white,
  },
  itemUnread: { backgroundColor: Brand.infoLight + '40' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: Brand.navy, flex: 1 },
  itemTime: { fontSize: 11, color: Brand.gray400, flexShrink: 0 },
  itemBody: { fontSize: 13, color: Brand.gray500, marginTop: 2, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.terracotta,
    flexShrink: 0,
  },
  separator: { height: 1, backgroundColor: Brand.gray100, marginLeft: 72 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  emptyBody: { fontSize: 14, color: Brand.gray500, textAlign: 'center', lineHeight: 20 },
});
