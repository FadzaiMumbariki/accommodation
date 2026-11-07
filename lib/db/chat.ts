import { supabase } from '../supabase';
import type { Conversation, ChatMessage, UserRole, BlockedUser } from '../../types';
import {
  type ConversationRow,
  type MessageRow,
  rowToConversation,
  rowToMessage,
  isMessageRow,
  generateUuid,
} from './types';

export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
}

const CONVERSATION_SELECT =
  '*, tenant:profiles!conversations_tenant_id_fkey(full_name, avatar_url, phone), landlord:profiles!conversations_landlord_id_fkey(full_name, avatar_url, phone), properties(title)';

const MESSAGE_PAGE_SIZE = 30;

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) return [];
  const [convResult, blockedIds] = await Promise.all([
    supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    fetchBlockedUserIds(userId).catch((err) => {
      console.warn('[fetchConversations] Could not fetch blocked users:', err);
      return [] as string[];
    }),
  ]);
  if (convResult.error) {
    console.error('[fetchConversations]', convResult.error.message);
    throw convResult.error;
  }
  const blockedSet = new Set(blockedIds);
  return (convResult.data ?? [])
    .map((row) => rowToConversation(row as unknown as ConversationRow, userId))
    .filter((c) => !blockedSet.has(c.participantId));
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) {
    console.error('[blockUser]', error.message);
    throw error;
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) {
    console.error('[unblockUser]', error.message);
    throw error;
  }
}

export async function fetchBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blocked_users')
    .select(
      'blocked_id, created_at, blocked:profiles!blocked_users_blocked_id_fkey(full_name, avatar_url)',
    )
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchBlockedUsers]', error.message);
    throw error;
  }
  return (data ?? []).map((row: any) => ({
    id: row.blocked_id,
    fullName: row.blocked?.full_name ?? 'ImbaFind member',
    avatarUrl: row.blocked?.avatar_url ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function fetchBlockedUserIds(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) {
    console.error('[fetchBlockedUserIds]', error.message);
    throw error;
  }
  const ids = new Set<string>();
  for (const row of (data ?? []) as { blocker_id: string; blocked_id: string }[]) {
    if (row.blocker_id === userId) ids.add(row.blocked_id);
    if (row.blocked_id === userId) ids.add(row.blocker_id);
  }
  return Array.from(ids);
}

export async function fetchConversationById(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle();
  if (error) {
    if (error.code === '22P02') return null;
    console.error('[fetchConversationById]', error.message);
    throw error;
  }
  return data ? rowToConversation(data as unknown as ConversationRow, userId) : null;
}

export async function upsertConversation(
  userId: string,
  userRole: UserRole,
  participantId: string,
  propertyId?: string,
): Promise<Conversation> {
  if (!supabase) {
    return {
      id: `conv-${participantId}-${propertyId ?? 'direct'}`,
      participantId,
      participantName: userRole === 'tenant' ? 'Landlord' : 'Tenant',
      propertyId: propertyId ?? undefined,
      messages: [],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };
  }

  const tenantId = userRole === 'tenant' ? userId : participantId;
  const landlordId = userRole === 'landlord' ? userId : participantId;

  const { error: upsertError } = await supabase.from('conversations').upsert(
    {
      tenant_id: tenantId,
      landlord_id: landlordId,
      property_id: propertyId ?? null,
    },
    {
      onConflict: 'tenant_id,landlord_id,property_id',
      ignoreDuplicates: true,
    },
  );
  if (upsertError) {
    if (upsertError.code === '22P02') {
      return {
        id: `conv-${participantId}-${propertyId ?? 'direct'}`,
        participantId,
        participantName: userRole === 'tenant' ? 'Landlord' : 'Tenant',
        propertyId: propertyId ?? undefined,
        messages: [],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
    }
    console.error('[upsertConversation]', upsertError.message);
    throw upsertError;
  }
  let query = supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('tenant_id', tenantId)
    .eq('landlord_id', landlordId);
  query = propertyId ? query.eq('property_id', propertyId) : query.is('property_id', null);
  const { data, error } = await query.single();
  if (error) {
    if (error.code === '22P02') {
      return {
        id: `conv-${participantId}-${propertyId ?? 'direct'}`,
        participantId,
        participantName: userRole === 'tenant' ? 'Landlord' : 'Tenant',
        propertyId: propertyId ?? undefined,
        messages: [],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
    }
    console.error('[upsertConversation] Could not load conversation:', error.message);
    throw error;
  }
  return rowToConversation(data as unknown as ConversationRow, userId);
}

export async function fetchMessages(conversationId: string, before?: string): Promise<MessagePage> {
  if (!supabase) return { messages: [], hasMore: false };
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) {
    if (error.code === '22P02') return { messages: [], hasMore: false };
    console.error('[fetchMessages]', error.message);
    throw error;
  }
  const rows = data ?? [];
  return {
    messages: rows.map((r) => rowToMessage(r as unknown as MessageRow)).reverse(),
    hasMore: rows.length === MESSAGE_PAGE_SIZE,
  };
}

export async function sendChatMessage(conversationId: string, text: string): Promise<ChatMessage> {
  if (!supabase) {
    return {
      id: generateUuid(),
      conversationId,
      senderId: 'me',
      text,
      timestamp: new Date().toISOString(),
      read: true,
      deliveryStatus: 'sent',
    };
  }
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_text: text,
  });
  if (error) {
    if (error.code === '22P02') {
      return {
        id: generateUuid(),
        conversationId,
        senderId: 'me',
        text,
        timestamp: new Date().toISOString(),
        read: true,
        deliveryStatus: 'sent',
      };
    }
    console.error('[sendChatMessage]', error.message);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Your message could not be sent. Please retry.');
  return rowToMessage(row as unknown as MessageRow);
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
  userRole: UserRole,
): Promise<void> {
  if (!supabase) return;
  const { error: messageError } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);
  if (messageError) {
    if (messageError.code === '22P02') return;
    console.error('[markConversationRead] Could not mark messages:', messageError.message);
    throw messageError;
  }
  const unreadColumn = userRole === 'tenant' ? 'tenant_unread' : 'landlord_unread';
  const { error } = await supabase
    .from('conversations')
    .update({ [unreadColumn]: 0 })
    .eq('id', conversationId);
  if (error) {
    if (error.code === '22P02') return;
    console.error('[markConversationRead] Could not reset unread count:', error.message);
    throw error;
  }
}

export function subscribeToMessages(
  conversationIds: string[],
  onMessage: (message: ChatMessage) => void,
): () => void {
  if (!supabase || conversationIds.length === 0) return () => {};
  const channel = supabase
    .channel(`messages-${generateUuid()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=in.(${conversationIds.join(',')})`,
      },
      (payload) => {
        if (!isMessageRow(payload.new)) {
          console.error('[subscribeToMessages] Received a malformed message row.');
          return;
        }
        onMessage(rowToMessage(payload.new));
      },
    )
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}
