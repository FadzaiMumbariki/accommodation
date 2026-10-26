/**
 * SavedContext — manages which property IDs the user has saved.
 *
 * Syncs to Supabase when credentials are available; uses local
 * state as the source of truth otherwise.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import {
  fetchSavedPropertyIds,
  saveProperty,
  unsaveProperty,
} from '../lib/database';
import { toggleSavedPropertyOptimistically } from '../lib/savedPropertyToggle';
import { supabase } from '../lib/supabase';

interface SavedContextValue {
  savedPropertyIds: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => Promise<void>;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string | null;
}) {
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([]);

  // Load saved IDs from Supabase when signed in
  useEffect(() => {
    if (!supabase || !userId) return;
    fetchSavedPropertyIds(userId).then(ids => {
      if (ids.length > 0) setSavedPropertyIds(ids);
    });
  }, [userId]);

  const isSaved = useCallback(
    (id: string) => savedPropertyIds.includes(id),
    [savedPropertyIds],
  );

  const toggleSaved = useCallback(
    async (id: string) => {
      try {
        const succeeded = await toggleSavedPropertyOptimistically(
          id,
          savedPropertyIds,
          setSavedPropertyIds,
          wasSaved => {
            if (!supabase || !userId) return Promise.resolve(true);
            return wasSaved
              ? unsaveProperty(userId, id)
              : saveProperty(userId, id);
          },
        );
        if (!succeeded) {
          Alert.alert('Could not update saved properties', 'Please check your connection and try again.');
        }
      } catch (error) {
        console.error('[SavedContext] Failed to update saved properties:', error);
        Alert.alert('Could not update saved properties', 'Please check your connection and try again.');
      }
    },
    [savedPropertyIds, userId],
  );

  return (
    <SavedContext.Provider value={{ savedPropertyIds, isSaved, toggleSaved }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within SavedProvider');
  return ctx;
}
