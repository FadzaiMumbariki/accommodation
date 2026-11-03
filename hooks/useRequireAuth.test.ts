import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from './useRequireAuth';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

const pushMock = router.push as unknown as jest.Mock;
const useAuthMock = useAuth as unknown as jest.Mock;

function setAuth(value: { user: unknown; isSupabaseEnabled: boolean }) {
  useAuthMock.mockReturnValue(value);
}

describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when Supabase is disabled', async () => {
    setAuth({ user: null, isSupabaseEnabled: false });
    const { result } = await renderHook(() => useRequireAuth());

    expect(result.current('/saved')).toBe(true);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('allows access for a signed-in user', async () => {
    setAuth({ user: { id: 'user-1' }, isSupabaseEnabled: true });
    const { result } = await renderHook(() => useRequireAuth());

    expect(result.current('/saved')).toBe(true);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to login and reports the destination when signed out', async () => {
    setAuth({ user: null, isSupabaseEnabled: true });
    const { result } = await renderHook(() => useRequireAuth());

    expect(result.current('/saved')).toBe(false);
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/login',
      params: { returnTo: '/saved' },
    });
  });

  it('returns a stable function reference when auth state is unchanged', async () => {
    setAuth({ user: { id: 'user-1' }, isSupabaseEnabled: true });
    const { result, rerender } = await renderHook(() => useRequireAuth());
    const firstFn = result.current;
    rerender({});
    expect(result.current).toBe(firstFn);
  });
});
