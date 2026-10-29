/**
 * AppContext — thin compatibility layer.
 *
 * All state has been split into focused contexts:
 *   • PropertyContext  → properties, filters, myListings, addProperty
 *   • SavedContext     → savedPropertyIds, isSaved, toggleSaved
 *   • ChatContext      → conversations, sendMessage, startConversation
 *   • ActivityContext  → viewings, requests, selectedPropertyId
 *
 * This file re-exports a combined useApp() hook so existing screens
 * don't need to be rewritten — they still call useApp() and get all
 * the same values as before.
 *
 * New code should import from the focused contexts directly.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { PropertyProvider, useProperties } from './PropertyContext';
import { SavedProvider, useSaved } from './SavedContext';
import { ChatProvider, useChat } from './ChatContext';
import { ActivityProvider, useActivity } from './ActivityContext';
import type { UserRole, PropertyFilters } from '../types';
import { fetchProfile } from '../lib/database';

// ─────────────────────────────────────────────────────────────────────────────
// Role context (small — stays here)
// ─────────────────────────────────────────────────────────────────────────────
interface RoleContextValue {
  userRole: UserRole;
  userName: string;
  isAdmin: boolean;
  /** Sets the role. `localOnly` caches it without touching the signed-in user's profile. */
  setUserRole: (role: UserRole, options?: { localOnly?: boolean }) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const ROLE_KEY = 'imbafind_user_role';

function RoleProvider({ children }: { children: ReactNode }) {
  const { user, changeRole, isSupabaseEnabled } = useAuth();
  const [userRole, setUserRoleState] = useState<UserRole>('tenant');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (user) {
      void fetchProfile(user.id).then(profile => {
        if (!active || !profile) return;
        setUserRoleState(profile.role);
        setIsAdmin(profile.isAdmin);
      });
      return () => {
        active = false;
      };
    }

    if (isSupabaseEnabled) {
      // Intentional synchronous reset so a stale role (e.g. from a previous
      // landlord session) doesn't persist after the user logs out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserRoleState('tenant');
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }

    void AsyncStorage.getItem(ROLE_KEY).then(stored => {
      if (active && (stored === 'landlord' || stored === 'tenant')) {
        setUserRoleState(stored);
      }
    }).catch(error => {
      console.error('[RoleProvider] Failed to read cached role:', error);
    });
    return () => {
      active = false;
    };
  }, [isSupabaseEnabled, user]);

  const setUserRole = useCallback(async (role: UserRole, options?: { localOnly?: boolean }): Promise<boolean> => {
    if (user && isSupabaseEnabled && !options?.localOnly) {
      const updated = await changeRole(user.id, role);
      if (!updated) return false;
    }
    setUserRoleState(role);
    try {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } catch (error) {
      console.error('[RoleProvider] Failed to cache role:', error);
    }
    return true;
  }, [changeRole, isSupabaseEnabled, user]);

  const userName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'User';

  return (
    <RoleContext.Provider value={{ userRole, userName, isAdmin, setUserRole }}>
      {children}
    </RoleContext.Provider>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <RoleProvider>
      <RoleConsumerWrapper key={user?.id ?? 'guest'} userId={user?.id}>
        {children}
      </RoleConsumerWrapper>
    </RoleProvider>
  );
}

/** Reads role from RoleContext so sub-providers can receive it */
function RoleConsumerWrapper({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string;
}) {
  const { userRole, userName } = useContext(RoleContext)!;
  return (
    <PropertyProvider userId={userId} userRole={userRole}>
      <SavedProvider userId={userId}>
        <ChatProvider userId={userId} userRole={userRole}>
          <ActivityProvider userId={userId} userRole={userRole} userName={userName}>
            {children}
          </ActivityProvider>
        </ChatProvider>
      </SavedProvider>
    </PropertyProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useApp — combined hook for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────
export function useApp() {
  const roleCtx = useContext(RoleContext);
  if (!roleCtx) throw new Error('useApp must be used within AppProvider');

  const properties = useProperties();
  const saved = useSaved();
  const chat = useChat();
  const activity = useActivity();

  /** @deprecated Use useSaved().toggleSaved instead */
  const toggleSaveProperty = saved.toggleSaved;
  /** @deprecated Use useSaved().isSaved instead */
  const isPropertySaved = saved.isSaved;
  const setFilters: (filters: PropertyFilters) => void = properties.setFilters;

  return {
    // Role
    userRole: roleCtx.userRole,
    userName: roleCtx.userName,
    isAdmin: roleCtx.isAdmin,
    setUserRole: roleCtx.setUserRole,

    // Properties
    properties: properties.properties,
    myListings: properties.myListings,
    propertiesLoading: properties.loading,
    isOffline: properties.isOffline,
    hasCachedProperties: properties.hasCachedProperties,
    lastSyncedAt: properties.lastSyncedAt,
    propertiesError: properties.error,
    refreshProperties: properties.refresh,
    hasMoreProperties: properties.hasMoreProperties,
    loadMoreProperties: properties.loadMoreProperties,
    filters: properties.filters,
    setFilters,
    filteredProperties: properties.filteredProperties,
    addProperty: properties.addProperty,
    updateProperty: properties.updateProperty,
    deleteProperty: properties.deleteProperty,

    // Saved
    savedPropertyIds: saved.savedPropertyIds,
    toggleSaved: saved.toggleSaved,
    isSaved: saved.isSaved,
    toggleSaveProperty,
    isPropertySaved,

    // Chat
    conversations: chat.conversations,
    sendMessage: chat.sendMessage,
    startConversation: chat.startConversation,
    startConversationWithUser: chat.startConversationWithUser,
    openConversation: chat.openConversation,
    retryMessage: chat.retryMessage,
    loadOlderMessages: chat.loadOlderMessages,
    hasOlderMessages: chat.hasOlderMessages,
    chatLoading: chat.loading,
    chatError: chat.error,
    chatMessageLoading: chat.messageLoading,
    chatMessageError: chat.messageError,
    refreshConversations: chat.refresh,
    selectedConversationId: chat.selectedConversationId,
    setSelectedConversationId: chat.setSelectedConversationId,

    // Activity
    viewings: activity.viewings,
    addViewing: activity.addViewing,
    updateViewingStatus: activity.updateViewingStatus,
    activityLoading: activity.loading,
    activityError: activity.error,
    refreshActivity: activity.refresh,
    requests: activity.requests,
    addRequest: activity.addRequest,
    updateRequestStatus: activity.updateRequestStatus,
    selectedPropertyId: activity.selectedPropertyId,
    setSelectedPropertyId: activity.setSelectedPropertyId,
  };
}
