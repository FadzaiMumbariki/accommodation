import { describe, expect, it, jest } from '@jest/globals';

import { hasRealSession } from './session';
import { supabase } from './supabase';

// The client is mocked so the tests never touch a real network. `hasRealSession`
// reads the mocked `supabase` object at call time, so mutating the jest.fn here
// is enough to drive each branch.
jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

const getSession = supabase!.auth.getSession as unknown as jest.Mock<() => Promise<unknown>>;

describe('hasRealSession', () => {
  it('returns true when a session has a user', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    await expect(hasRealSession()).resolves.toBe(true);
  });

  it('returns false when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(hasRealSession()).resolves.toBe(false);
  });

  it('returns false when there is a session object but no user', async () => {
    getSession.mockResolvedValue({ data: { session: { user: null } } });
    await expect(hasRealSession()).resolves.toBe(false);
  });

  it('returns false when getSession throws', async () => {
    getSession.mockRejectedValue(new Error('network down'));
    await expect(hasRealSession()).resolves.toBe(false);
  });

  it('returns false when Supabase is not configured', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('./supabase', () => ({ supabase: null }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const isolated = require('./session') as typeof import('./session');
      await expect(isolated.hasRealSession()).resolves.toBe(false);
    });
  });
});
