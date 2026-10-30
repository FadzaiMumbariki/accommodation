import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../context/ChatContext';
import { useProperties } from '../context/PropertyContext';
import { Brand } from '../constants/Colors';
import { ChatBubble } from '../components/chat/ChatBubble';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { ReportDialog } from '../components/common/ReportDialog';
import { insertReport, blockUser } from '../lib/database';
import { hasRealSession } from '../lib/session';


export default function ChatScreen() {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    sendMessage,
    retryMessage,
    openConversation,
    startConversationWithUser,
    loadOlderMessages,
    hasOlderMessages,
    messageLoading: chatMessageLoading,
    messageError: chatMessageError,
  } = useChat();
  const { properties } = useProperties();
  const { user, isSupabaseEnabled } = useAuth();
  const requireAuth = useRequireAuth();
  const { recipientId, recipientName, conversationId: linkedConversationId } = useLocalSearchParams<{
    recipientId?: string;
    recipientName?: string;
    conversationId?: string;
  }>();
  const conversation = conversations.find(c => c.id === selectedConversationId);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const openedRecipient = useRef<string | null>(null);
  const openedConversation = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!recipientId || openedRecipient.current === recipientId) return;
    openedRecipient.current = recipientId;
    let active = true;
    void (async () => {
      try {
        if (isSupabaseEnabled && !(await hasRealSession())) {
          if (active) {
            Alert.alert(
              'Sign in to message',
              'Chatting with landlords is tied to your real ImbaFind account. Please sign in to start this conversation.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign in',
                  onPress: () =>
                    router.push({ pathname: '/login', params: { returnTo: '/(tabs)/explore' } }),
                },
              ],
            );
          }
          return;
        }
        const id = await startConversationWithUser(
          recipientId,
          typeof recipientName === 'string' ? recipientName : undefined,
        );
        if (!active) return;
        setSelectedConversationId(id);
        await openConversation(id);
      } catch (error) {
        console.error('[ChatScreen] Could not open requested conversation:', error);
        if (active) setOpeningError('Could not start this conversation. Please try again.');
      }
    })();
    return () => {
      active = false;
    };
  }, [isSupabaseEnabled, openConversation, recipientId, recipientName, setSelectedConversationId, startConversationWithUser]);

  useEffect(() => {
    if (!linkedConversationId || openedConversation.current === linkedConversationId) return;
    openedConversation.current = linkedConversationId;
    setSelectedConversationId(linkedConversationId);
    void openConversation(linkedConversationId).catch(error => {
      console.error('[ChatScreen] Could not open linked conversation:', error);
      setOpeningError('Could not open this conversation. Please try again from Messages.');
    });
  }, [linkedConversationId, openConversation, setSelectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || recipientId || linkedConversationId) return;
    void openConversation(selectedConversationId).catch(error => {
      console.error('[ChatScreen] Could not load selected conversation:', error);
    });
  }, [linkedConversationId, openConversation, recipientId, selectedConversationId]);

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Brand.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        {openingError ? (
          <View style={styles.empty}>
            <Text style={{ color: Brand.gray500, fontSize: 15, textAlign: 'center', paddingHorizontal: 40 }}>
              {openingError}
            </Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <ActivityIndicator color={Brand.terracotta} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const relatedProperty = properties.find(p => p.id === conversation.propertyId);

  const handleCall = () => {
    const phone = conversation.participantPhone ?? relatedProperty?.landlord?.phone;
    if (!phone) {
      Alert.alert('Phone number unavailable', 'You can continue chatting here.');
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    void Linking.openURL(`tel:${cleanPhone}`).catch(error => {
      console.error('[ChatScreen] Could not open phone link:', error);
      Alert.alert('Could not place call', 'Please try again.');
    });
  };

  const handleBlockUser = () => {
    if (!conversation) return;
    if (isSupabaseEnabled && !requireAuth('/chat')) return;
    Alert.alert(
      `Block ${conversation.participantName}?`,
      'They will no longer be able to message you, and their conversations will be hidden.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Sign in required', 'Please sign in to block users.');
              return;
            }
            setBlocking(true);
            try {
              await blockUser(user.id, conversation.participantId);
              Alert.alert('User blocked', `${conversation.participantName} has been blocked.`);
              router.back();
            } catch (error) {
              console.error('[ChatScreen] Could not block user:', error);
              Alert.alert(
                'Could not block user',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setBlocking(false);
            }
          },
        },
      ],
    );
  };

  const submitUserReport = async (reason: string, details: string): Promise<boolean> => {
    if (!user || !conversation) return false;
    setReportSubmitting(true);
    try {
      await insertReport({
        reporterId: user.id,
        reportedUserId: conversation.participantId,
        reason,
        details,
      });
      setReportVisible(false);
      Alert.alert('Report submitted', 'Thank you. Our team will review this report.');
      return true;
    } catch (error) {
      console.error('[ChatScreen] Could not submit user report:', error);
      Alert.alert(
        'Report not submitted',
        error instanceof Error ? error.message : 'Please try again.',
      );
      return false;
    } finally {
      setReportSubmitting(false);
    }
  };

  const send = async () => {
    const text = draftText.trim();
    if (!text || sending) return;
    if (isSupabaseEnabled && !(await hasRealSession())) {
      Alert.alert(
        'Sign in to send messages',
        'Messaging is connected to your real ImbaFind account. Please sign in to start chatting.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Sign in',
            onPress: () =>
              router.push({ pathname: '/login', params: { returnTo: '/(tabs)/messages' } }),
          },
        ],
      );
      return;
    }
    setSending(true);
    try {
      await sendMessage(conversation.id, text);
      setDraftText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      console.error('[ChatScreen] Message send failed:', error);
      setDraftText('');
      Alert.alert('Message not sent', 'Tap the failed message to retry sending.');
      return;
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {conversation.participantAvatar ? (
            <Image
              source={{ uri: conversation.participantAvatar }}
              style={styles.headerAvatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Text style={styles.headerAvatarInitial}>{conversation.participantName[0]}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerTitle}>{conversation.participantName}</Text>
            <Text style={styles.headerSub}>Active now</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {conversation.participantPhone || relatedProperty?.landlord?.phone ? (
            <TouchableOpacity
              onPress={handleCall}
              style={styles.callBtn}
              accessibilityRole="button"
              accessibilityLabel="Call conversation participant"
            >
              <Ionicons name="call-outline" size={22} color={Brand.navy} />
            </TouchableOpacity>
          ) : null}
          {isSupabaseEnabled && (
            <TouchableOpacity
              onPress={handleBlockUser}
              style={styles.callBtn}
              disabled={blocking}
              accessibilityRole="button"
              accessibilityLabel="Block conversation participant"
            >
              <Ionicons name="ban-outline" size={20} color={Brand.error} />
            </TouchableOpacity>
          )}
          {isSupabaseEnabled && (
            <TouchableOpacity
              onPress={() => {
                if (requireAuth('/chat')) setReportVisible(true);
              }}
              style={styles.callBtn}
              accessibilityRole="button"
              accessibilityLabel="Report conversation participant"
            >
              <Ionicons name="flag-outline" size={20} color={Brand.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Property Preview Card */}
      {relatedProperty && (
        <TouchableOpacity
          style={styles.propertyCard}
          onPress={() => {
            router.push(`/property-details?id=${relatedProperty.id}`);
          }}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: relatedProperty.images[0] }}
            style={styles.propImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <View style={styles.propInfo}>
            <Text style={styles.propTitle} numberOfLines={1}>{relatedProperty.title}</Text>
            <Text style={styles.propLocation}>{relatedProperty.suburb}, {relatedProperty.city}</Text>
          </View>
          <Text style={styles.propPrice}>${relatedProperty.price}/mo</Text>
        </TouchableOpacity>
      )}

      {/* Messages */}
      {hasOlderMessages && (
        <TouchableOpacity
          style={styles.loadOlder}
          onPress={() => void loadOlderMessages()}
          disabled={chatMessageLoading}
        >
          {chatMessageLoading
            ? <ActivityIndicator size="small" color={Brand.terracotta} />
            : <Text style={styles.loadOlderText}>Load older messages</Text>}
        </TouchableOpacity>
      )}
      {chatMessageError && (
        <TouchableOpacity
          style={styles.messageError}
          onPress={() => void openConversation(conversation.id)}
        >
          <Text style={styles.messageErrorText}>{chatMessageError} Tap to retry.</Text>
        </TouchableOpacity>
      )}
      <FlatList
        ref={listRef}
        data={conversation.messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            isCurrentUser={item.senderId === (isSupabaseEnabled ? user?.id : 'me')}
            onRetry={item.deliveryStatus === 'failed'
              ? () => void retryMessage(conversation.id, item.id).catch(error => {
                  console.error('[ChatScreen] Message retry failed:', error);
                  Alert.alert('Retry failed', 'Please try again.');
                })
              : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Send a message to start the conversation!</Text>
          </View>
        }
      />

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message…"
            placeholderTextColor={Brand.gray400}
            value={draftText}
            onChangeText={setDraftText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !draftText.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!draftText.trim() || sending}
            accessibilityLabel="Send message"
          >
            {sending
              ? <ActivityIndicator size="small" color={Brand.white} />
              : <Ionicons name="send" size={18} color={Brand.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <ReportDialog
        visible={reportVisible}
        title="Report user"
        targetLabel={conversation.participantName}
        submitting={reportSubmitting}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitUserReport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Brand.gray200, backgroundColor: Brand.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: {
    backgroundColor: Brand.navy + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: Brand.navy,
    fontWeight: '700',
    fontSize: 15,
  },
  callBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Brand.navy },
  headerSub: { fontSize: 11, color: Brand.success, fontWeight: '500' },
  propertyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Brand.white, marginHorizontal: 12, marginTop: 10,
    borderRadius: 12, padding: 10, borderLeftWidth: 3, borderLeftColor: Brand.terracotta,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  propImg: { width: 44, height: 44, borderRadius: 8 },
  propInfo: { flex: 1 },
  propTitle: { fontSize: 12, fontWeight: '700', color: Brand.navy },
  propLocation: { fontSize: 11, color: Brand.gray400, marginTop: 1 },
  propPrice: { fontSize: 13, fontWeight: '700', color: Brand.terracotta },
  messagesList: { paddingHorizontal: 14, paddingVertical: 16, gap: 10 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Brand.white,
    shadowColor: Brand.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  bubbleMe: {
    backgroundColor: Brand.terracotta,
    borderBottomRightRadius: 4,
  },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: Brand.navy, lineHeight: 20 },
  bubbleTextMe: { color: Brand.white },
  bubbleTime: { fontSize: 10, color: Brand.gray400, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13, color: Brand.gray400, textAlign: 'center' },
  loadOlder: { alignItems: 'center', paddingVertical: 10 },
  loadOlderText: { color: Brand.terracotta, fontSize: 13, fontWeight: '700' },
  messageError: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: Brand.error + '15' },
  messageErrorText: { color: Brand.error, fontSize: 12, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 24,
    backgroundColor: Brand.white, borderTopWidth: 1, borderTopColor: Brand.gray200,
  },
  textInput: {
    flex: 1, backgroundColor: Brand.gray100, borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, color: Brand.navy, maxHeight: 100,
  },
  sendBtn: { backgroundColor: Brand.terracotta, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Brand.gray300 },
});
