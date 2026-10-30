import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import { Brand } from '../../constants/Colors';
import { ConversationSkeleton } from '../../components/common/Skeleton';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { WebFooter } from '../../components/navigation/WebFooter';

function formatMessageTime(time: string) {
  if (!time) return '';
  const date = new Date(time);
  if (isNaN(date.getTime())) return time;
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
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export default function MessagesScreen() {
  const {
    conversations,
    setSelectedConversationId,
    loading: chatLoading,
    error: chatError,
    refresh: refreshConversations,
  } = useChat();
  const { userRole } = useRole();
  const [searchText, setSearchText] = useState('');
  const { isMobile } = useResponsive();

  const filtered = conversations.filter(c => {
    const q = searchText.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = c.participantName.toLowerCase().includes(q);
    const msgMatch = (c.lastMessage || '').toLowerCase().includes(q);
    const propMatch = (c.propertyTitle || '').toLowerCase().includes(q);
    return nameMatch || msgMatch || propMatch;
  });

  const open = (id: string) => {
    setSelectedConversationId(id);
    router.push('/chat');
  };

  const newMessage = () => {
    Alert.alert(
      'New Conversation',
      userRole === 'landlord'
        ? 'View active accommodation requests to reply to tenants.'
        : 'Browse properties to start a conversation with a landlord.',
      [
        {
          text: userRole === 'landlord' ? 'View Requests' : 'Browse Properties',
          onPress: () => userRole === 'landlord'
            ? router.push('/my-activity')
            : router.push('/(tabs)/explore'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ResponsiveContainer maxWidth={840} noPadding>
        <View style={[styles.header, !isMobile && styles.headerDesktop]}>
          <View>
            <Text style={styles.screenTitle}>Messages</Text>
            {!isMobile && (
              <Text style={styles.screenSub}>Chat directly with landlords and property seekers</Text>
            )}
          </View>
          {!isMobile && (
            <TouchableOpacity style={styles.desktopNewBtn} onPress={newMessage} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={16} color={Brand.white} />
              <Text style={styles.desktopNewBtnText}>New Message</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.searchRow, !isMobile && styles.searchRowDesktop]}>
          <Ionicons name="search-outline" size={16} color={Brand.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations by name, listing, or message…"
            placeholderTextColor={Brand.gray400}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={16} color={Brand.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </ResponsiveContainer>

      {/* Skeleton loading while conversations are being fetched */}
      {chatLoading ? (
        <ResponsiveContainer maxWidth={840}>
          <View style={{ paddingTop: 8 }}>
            {[1, 2, 3, 4].map(i => <ConversationSkeleton key={i} />)}
          </View>
        </ResponsiveContainer>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          style={{ flex: 1 }}
          refreshing={chatLoading}
          onRefresh={() => void refreshConversations()}
          contentContainerStyle={[styles.listContent, !isMobile && styles.listContentDesktop]}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Brand.gray200 + '80' }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convoItem}
              onPress={() => open(item.id)}
              activeOpacity={0.85}
            >
              <View style={styles.avatarWrap}>
                {item.participantAvatar ? (
                  <Image
                    source={{ uri: item.participantAvatar }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{(item.participantName ?? '?')[0]}</Text>
                  </View>
                )}
              </View>
              <View style={styles.convoBody}>
                <View style={styles.convoTop}>
                  <Text style={styles.participantName}>{item.participantName}</Text>
                  <Text style={styles.timeAgo}>{formatMessageTime(item.lastMessageTime)}</Text>
                </View>
                {item.propertyTitle && (
                  <View style={styles.propertyTag}>
                    <Ionicons name="home-outline" size={10} color={Brand.terracotta} />
                    <Text style={styles.propertyTagText} numberOfLines={1}>{item.propertyTitle}</Text>
                  </View>
                )}
                <View style={styles.lastRow}>
                  <Text
                    style={[styles.lastMsg, item.unreadCount > 0 && styles.lastMsgUnread]}
                    numberOfLines={1}
                  >
                    {item.lastMessage || 'Tap to chat'}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={54} color={Brand.gray300} />
              <Text style={styles.emptyTitle}>
                {searchText ? 'No conversations found' : 'No messages yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchText
                  ? `No chats matching "${searchText}".`
                  : chatError
                  ? chatError
                  : 'Direct chats with landlords and property seekers will appear here.'}
              </Text>
              {chatError && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => void refreshConversations()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={!isMobile ? <WebFooter /> : undefined}
        />
      )}

      {isMobile && (
        <TouchableOpacity style={styles.fab} onPress={newMessage} activeOpacity={0.85}>
          <Ionicons name="add-outline" size={22} color={Brand.white} />
          <Text style={styles.fabText}>New message</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
  },
  headerDesktop: {
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 16,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: Brand.navy },
  screenSub: { fontSize: 13, color: Brand.gray500, marginTop: 4 },
  desktopNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  desktopNewBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Brand.white, marginHorizontal: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  searchRowDesktop: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Brand.navy },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listContentDesktop: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingBottom: 40,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Brand.navy + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: Brand.navy },
  convoBody: { flex: 1 },
  convoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  participantName: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  timeAgo: { fontSize: 11, color: Brand.gray400 },
  propertyTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4,
  },
  propertyTagText: { fontSize: 11, color: Brand.terracotta, fontWeight: '600', flex: 1 },
  lastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, color: Brand.gray500, flex: 1 },
  lastMsgUnread: { color: Brand.navy, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: Brand.terracotta, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 100, gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  emptyDesc: { fontSize: 14, color: Brand.gray400, textAlign: 'center', lineHeight: 21 },
  retryBtn: { marginTop: 14, backgroundColor: Brand.terracotta, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: Brand.white, fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: { color: Brand.white, fontSize: 14, fontWeight: '700' },
});
