import { supabase } from './supabase';

/**
 * True only when there is a real authenticated Supabase session available.
 * Features that write on behalf of the signed-in user (AI, messaging) enforce
 * `auth.uid()` server-side, so anonymous browsing and the in-app demo account —
 * which fakes a user in React state without a real Supabase session — cannot use them.
 */
export async function hasRealSession(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.user);
  } catch {
    return false;
  }
}
