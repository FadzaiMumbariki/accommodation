import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth() {
  const { user, isSupabaseEnabled } = useAuth();

  return (returnTo: string): boolean => {
    if (!isSupabaseEnabled || user) return true;
    router.push({ pathname: '/login', params: { returnTo } });
    return false;
  };
}
