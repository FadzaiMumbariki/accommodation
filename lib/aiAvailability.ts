import { hasRealSession } from './session';

/**
 * The AI Edge Functions enforce a per-user rate limit that requires a signed-in
 * account (`auth.uid()`), so anonymous browsing and the in-app demo account
 * cannot use AI. This is the same real-session requirement as messaging.
 */
export async function hasRealAiSession(): Promise<boolean> {
  return hasRealSession();
}

export type AiUnavailableReason = 'auth' | 'limit' | 'outage';

/**
 * Classifies a Supabase Edge Functions error (or a returned error body) so the
 * UI can show a truthful reason instead of silently degrading to a fallback.
 */
export function describeAiError(error: unknown): AiUnavailableReason {
  const status = (error as { context?: { status?: number } })?.context?.status;
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'limit';
  return 'outage';
}

/** Short, user-facing explanation for each unavailability reason. */
export function aiUnavailableMessage(reason: AiUnavailableReason): string {
  switch (reason) {
    case 'auth':
      return 'Sign in to your ImbaFind account to use this AI feature.';
    case 'limit':
      return 'You have reached the AI usage limit for now. Please try again in an hour.';
    default:
      return 'AI is temporarily unavailable, so we used standard results instead.';
  }
}
