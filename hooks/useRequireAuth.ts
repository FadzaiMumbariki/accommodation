import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth() {
  const { user, isSupabaseEnabled } = useAuth();

  return useCallback(
    (returnTo: string): boolean => {
      if (!isSupabaseEnabled || user) return true;
      router.push({ pathname: '/login', params: { returnTo } });
      return false;
    },
    [user, isSupabaseEnabled],
  );
}
