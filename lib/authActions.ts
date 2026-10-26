import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '../types';

export interface RoleSignUpClient {
  auth: {
    signUp(credentials: {
      email: string;
      password: string;
      options: {
        data: {
          full_name: string;
          phone: string | null;
          role: UserRole;
        };
      };
    }): Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
  };
}

export interface SignUpResult {
  error: string | null;
  requiresEmailConfirmation: boolean;
}

export async function signUpWithRole(
  client: RoleSignUpClient | null,
  email: string,
  password: string,
  fullName: string,
  phone: string | undefined,
  role: UserRole,
): Promise<SignUpResult> {
  if (!client) return { error: null, requiresEmailConfirmation: false };

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone?.trim() || null,
        role,
      },
    },
  });
  if (error) return { error: error.message, requiresEmailConfirmation: false };
  return { error: null, requiresEmailConfirmation: data.session === null };
}

export function changeUserRole(
  userId: string,
  role: UserRole,
  persist: (id: string, updates: { role: UserRole }) => Promise<boolean>,
): Promise<boolean> {
  return persist(userId, { role });
}
