import { describe, expect, it } from '@jest/globals';
import { classifyAuthError } from './authErrors';
import { signUpWithRole, type RoleSignUpClient } from './authActions';
import type { Session } from '@supabase/supabase-js';

describe('classifyAuthError', () => {
  it('turns a rate limit into a friendly wait message', () => {
    expect(classifyAuthError('', 429).message).toMatch(/wait/i);
    expect(classifyAuthError('Rate limit exceeded').title).toMatch(/hold on/i);
  });

  it('explains an existing account', () => {
    expect(classifyAuthError('User already registered').title).toMatch(/already exists/i);
  });

  it('guides email confirmation', () => {
    expect(classifyAuthError('Email not confirmed').title).toMatch(/confirm/i);
  });

  it('handles network failures', () => {
    expect(classifyAuthError('Failed to fetch').title).toMatch(/no connection/i);
  });

  it('never returns an empty message', () => {
    const result = classifyAuthError('');
    expect(result.message.trim().length).toBeGreaterThan(0);
  });
});

describe('signUpWithRole empty-error fallback', () => {
  it('returns a non-empty error when the API fails with an empty message', async () => {
    const client: RoleSignUpClient = {
      auth: {
        signUp: async () => ({
          data: { session: null as Session | null },
          error: { message: '', status: 429 },
        }),
      },
    };

    const result = await signUpWithRole(client, 'a@b.com', 'password1', 'A B', undefined, 'tenant');
    expect(result.error).toBeTruthy();
    expect(result.requiresEmailConfirmation).toBe(false);
  });
});
