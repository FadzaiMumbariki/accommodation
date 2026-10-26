/**
 * ChatContext — conversations and messaging.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Conversation, ChatMessage, Property, UserRole } from '../types';
import { MOCK_CONVERSATIONS } from '../constants/mockData';
import { supabase } from '../lib/supabase';
import {
  fetchConversations,
  fetchConversationById,
  fetchMessages,
  markConversationRead,
  sendChatMessage,
  subscribeToMessages,
  upsertConversation,
} from '../lib/database';

interface ChatContextValue {
  conversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  openConversation: (id: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  retryMessage: (conversationId: string, messageId: string) => Promise<void>;
  startConversation: (property: Property) => Promise<string>;
  startConversationWithUser: (recipientId: string, recipientName?: string) => Promise<string>;
  loadOlderMessages: () => Promise<void>;
  hasOlderMessages: boolean;
  loading: boolean;
  messageLoading: boolean;
  error: string | null;
  messageError: string | null;
  refresh: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  userId,
  userRole,
}: {
  children: ReactNode;
  userId?: string;
  userRole: UserRole;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(
    () => supabase ? [] : MOCK_CONVERSATIONS,
  );
  const conversationsRef = useRef(conversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase && userId));
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [hasOlderByConversation, setHasOlderByConversation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setConversations(await fetchConversations(userId));
    } catch (fetchError) {
      console.error('[ChatContext] Could not load conversations:', fetchError);
      setError('Could not load conversations. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // refresh() is async; its initial loading-state update trips the
    // set-state-in-effect rule, but this fetch-on-mount pattern is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const openConversation = useCallback(async (id: string) => {
    setSelectedConversationId(id);
    setMessageError(null);
    if (!supabase || !userId) return;
    setMessageLoading(true);
    try {
      if (!conversationsRef.current.some(conversation => conversation.id === id)) {
        const conversation = await fetchConversationById(id, userId);
        if (!conversation) throw new Error('This conversation is not available for your account.');
        setConversations(previous => [
          conversation,
          ...previous.filter(item => item.id !== conversation.id),
        ]);
      }
      const result = await fetchMessages(id);
      setConversations(previous => previous.map(conversation =>
        conversation.id === id ? { ...conversation, messages: result.messages, unreadCount: 0 } : conversation,
      ));
      setHasOlderByConversation(previous => ({ ...previous, [id]: result.hasMore }));
      await markConversationRead(id, userId, userRole);
    } catch (loadError) {
      console.error('[ChatContext] Could not open conversation:', loadError);
      setMessageError('Could not load this conversation. Please try again.');
      throw loadError;
    } finally {
      setMessageLoading(false);
    }
  }, [userId, userRole]);

  const sendMessage = useCallback(async (conversationId: string, rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    if (supabase && !userId) throw new Error('Please sign in to send messages.');
    const pending: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: userId ?? 'me',
      text,
      timestamp: new Date().toISOString(),
      read: false,
      deliveryStatus: supabase ? 'sending' : 'sent',
    };
    setConversations(previous => previous.map(conversation =>
      conversation.id === conversationId
        ? {
            ...conversation,
            messages: [...conversation.messages, pending],
            lastMessage: text,
            lastMessageTime: pending.timestamp,
            unreadCount: 0,
          }
        : conversation,
    ));
    if (!supabase) return;

    try {
      const sent = await sendChatMessage(conversationId, text);
      setConversations(previous => previous.map(conversation =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === pending.id ? sent : message,
              ),
              lastMessage: text,
              lastMessageTime: sent.timestamp,
            }
          : conversation,
      ));
    } catch (sendError) {
      setConversations(previous => previous.map(conversation =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === pending.id ? { ...message, deliveryStatus: 'failed' } : message,
              ),
            }
          : conversation,
      ));
      throw sendError;
    }
  }, [userId]);

  const retryMessage = useCallback(async (conversationId: string, messageId: string) => {
    const pending = conversations
      .find(conversation => conversation.id === conversationId)
      ?.messages.find(message => message.id === messageId);
    if (!pending) return;
    setConversations(previous => previous.map(conversation =>
      conversation.id === conversationId
        ? {
            ...conversation,
            messages: conversation.messages.map(message =>
              message.id === messageId ? { ...message, deliveryStatus: 'sending' } : message,
            ),
          }
        : conversation,
    ));
    if (!supabase) {
      setConversations(previous => previous.map(conversation =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === messageId ? { ...message, deliveryStatus: 'sent' } : message,
              ),
            }
          : conversation,
      ));
      return;
    }
    try {
      const sent = await sendChatMessage(conversationId, pending.text);
      setConversations(previous => previous.map(conversation =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === messageId ? sent : message,
              ),
              lastMessage: sent.text,
              lastMessageTime: sent.timestamp,
            }
          : conversation,
      ));
    } catch (sendError) {
      setConversations(previous => previous.map(conversation =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map(message =>
                message.id === messageId ? { ...message, deliveryStatus: 'failed' } : message,
              ),
            }
          : conversation,
      ));
      throw sendError;
    }
  }, [conversations]);

  const startConversationWithUser = useCallback(async (
    recipientId: string,
    recipientName = 'ImbaFind member',
  ): Promise<string> => {
    if (!userId && supabase) throw new Error('Please sign in to start a conversation.');
    if (supabase && userId) {
      const conversation = await upsertConversation(userId, userRole, recipientId);
      setConversations(previous => [
        conversation,
        ...previous.filter(item => item.id !== conversation.id),
      ]);
      return conversation.id;
    }
    const existing = conversations.find(item => item.participantId === recipientId && !item.propertyId);
    if (existing) return existing.id;
    const id = `conv-${Date.now()}`;
    setConversations(previous => [{
      id,
      participantId: recipientId,
      participantName: recipientName,
      messages: [],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    }, ...previous]);
    return id;
  }, [conversations, userId, userRole]);

  const startConversation = useCallback(async (property: Property): Promise<string> => {
    if (userRole !== 'tenant') {
      throw new Error('Landlords can start conversations by replying to an accommodation request.');
    }
    const participantId = property.landlordId ?? property.landlord.id;
    if (!userId && supabase) throw new Error('Please sign in to start a conversation.');
    if (supabase && userId) {
      const conversation = await upsertConversation(userId, userRole, participantId, property.id);
      setConversations(previous => [
        conversation,
        ...previous.filter(item => item.id !== conversation.id),
      ]);
      return conversation.id;
    }
    const existing = conversations.find(item => item.propertyId === property.id);
    if (existing) return existing.id;
    const id = `conv-${Date.now()}`;
    setConversations(previous => [{
      id,
      participantId,
      participantName: property.landlord.name,
      participantAvatar: property.landlord.avatar,
      propertyId: property.id,
      propertyTitle: property.title,
      messages: [],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    }, ...previous]);
    return id;
  }, [conversations, userId, userRole]);

  const loadOlderMessages = useCallback(async () => {
    const id = selectedConversationId;
    if (!supabase || !id || !hasOlderByConversation[id] || messageLoading) return;
    const current = conversations.find(conversation => conversation.id === id);
    const oldest = current?.messages[0]?.timestamp;
    if (!oldest) return;
    setMessageLoading(true);
    setMessageError(null);
    try {
      const result = await fetchMessages(id, oldest);
      setConversations(previous => previous.map(conversation => {
        if (conversation.id !== id) return conversation;
        const ids = new Set(conversation.messages.map(message => message.id));
        return {
          ...conversation,
          messages: [
            ...result.messages.filter(message => !ids.has(message.id)),
            ...conversation.messages,
          ],
        };
      }));
      setHasOlderByConversation(previous => ({ ...previous, [id]: result.hasMore }));
    } catch (loadError) {
      console.error('[ChatContext] Could not load older messages:', loadError);
      setMessageError('Could not load older messages. Please retry.');
    } finally {
      setMessageLoading(false);
    }
  }, [conversations, hasOlderByConversation, messageLoading, selectedConversationId]);

  const conversationIdKey = conversations.map(conversation => conversation.id).join(',');
  useEffect(() => {
    if (!userId || !supabase || !conversationIdKey) return;
    const unsubscribe = subscribeToMessages(conversationIdKey.split(','), message => {
      const conversationId = message.conversationId;
      if (!conversationId) return;
      setConversations(previous => previous.map(conversation => {
        if (conversation.id !== conversationId) return conversation;
        if (conversation.messages.some(existing => existing.id === message.id)) return conversation;
        return {
          ...conversation,
          messages: [...conversation.messages, message],
          lastMessage: message.text,
          lastMessageTime: message.timestamp,
          unreadCount: message.senderId === userId
            ? conversation.unreadCount
            : selectedConversationId === conversationId ? 0 : conversation.unreadCount + 1,
        };
      }));
      if (message.senderId !== userId && selectedConversationId === conversationId) {
        void markConversationRead(conversationId, userId, userRole).catch(readError => {
          console.error('[ChatContext] Could not mark realtime message as read:', readError);
        });
      }
    });
    return unsubscribe;
  }, [conversationIdKey, selectedConversationId, userId, userRole]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        openConversation,
        sendMessage,
        retryMessage,
        startConversation,
        startConversationWithUser,
        loadOlderMessages,
        hasOlderMessages: Boolean(selectedConversationId && hasOlderByConversation[selectedConversationId]),
        loading,
        messageLoading,
        error,
        messageError,
        refresh,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
