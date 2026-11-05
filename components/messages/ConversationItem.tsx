import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import type { Conversation } from '../../types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: (id: string) => void;
  formatTime: (time: string) => string;
}

const ConversationItemComponent: React.FC<ConversationItemProps> = ({
  conversation,
  onPress,
  formatTime,
}) => {
  return (
    <TouchableOpacity
      style={styles.convoItem}
      onPress={() => onPress(conversation.id)}
      activeOpacity={0.85}
    >
      <View style={styles.avatarWrap}>
        {conversation.participantAvatar ? (
          <Image
            source={{ uri: conversation.participantAvatar }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(conversation.participantName ?? '?')[0]}</Text>
          </View>
        )}
      </View>
      <View style={styles.convoBody}>
        <View style={styles.convoTop}>
          <Text style={styles.participantName}>{conversation.participantName}</Text>
          <Text style={styles.timeAgo}>{formatTime(conversation.lastMessageTime)}</Text>
        </View>
        {conversation.propertyTitle && (
          <View style={styles.propertyTag}>
            <Ionicons name="home-outline" size={10} color={Brand.terracotta} />
            <Text style={styles.propertyTagText} numberOfLines={1}>
              {conversation.propertyTitle}
            </Text>
          </View>
        )}
        <View style={styles.lastRow}>
          <Text
            style={[styles.lastMsg, conversation.unreadCount > 0 && styles.lastMsgUnread]}
            numberOfLines={1}
          >
            {conversation.lastMessage || 'Tap to chat'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Memoized conversation list item to prevent unnecessary re-renders.
 * Only re-renders when conversation data, onPress, or formatTime changes.
 */
export const ConversationItem = React.memo(ConversationItemComponent);

const styles = StyleSheet.create({
  convoItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Brand.white,
    gap: 12,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: Brand.gray100,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.terracotta + '20',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.terracotta,
    textTransform: 'uppercase',
  },
  convoBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  convoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
    flex: 1,
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 11,
    color: Brand.gray400,
    fontWeight: '500',
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  propertyTagText: {
    fontSize: 11,
    color: Brand.gray500,
    fontWeight: '500',
    flex: 1,
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMsg: {
    fontSize: 13,
    color: Brand.gray500,
    flex: 1,
    marginRight: 8,
  },
  lastMsgUnread: {
    fontWeight: '600',
    color: Brand.navy,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.white,
  },
});
