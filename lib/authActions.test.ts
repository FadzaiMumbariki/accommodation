import { describe, expect, it, jest } from '@jest/globals';
import type { Session } from '@supabase/supabase-js';
import { changeUserRole, signUpWithRole, type RoleSignUpClient } from './authActions';

describe('authentication role actions', () => {
  it('sends the selected role in signup metadata and detects email confirmation', async () => {
    const signUp = jest.fn(async (_credentials: Parameters<RoleSignUpClient['auth']['signUp']>[0]) => ({
      data: { session: null as Session | null },
      error: null,
    }));
    const client: RoleSignUpClient = { auth: { signUp } };

    const result = await signUpWithRole(
      client,
      'tenant@example.com',
      'secure-password',
      'Test Tenant',
      '  +263771234567  ',
      'tenant',
    );

    expect(signUp).toHaveBeenCalledWith({
      email: 'tenant@example.com',
      password: 'secure-password',
      options: {
        data: {
          full_name: 'Test Tenant',
          phone: '+263771234567',
          role: 'tenant',
        },
      },
    });
    expect(result).toEqual({ error: null, requiresEmailConfirmation: true });
  });

  it('persists role changes through the profile updater', async () => {
    const persistProfile = jest.fn(async () => true);

    await expect(changeUserRole('user-1', 'landlord', persistProfile)).resolves.toBe(true);
    expect(persistProfile).toHaveBeenCalledWith('user-1', { role: 'landlord' });
  });
});
