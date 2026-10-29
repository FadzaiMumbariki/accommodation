export interface FriendlyAuthError {
  title: string;
  message: string;
}

/**
 * Turns raw Supabase Auth errors (which are often technical or, in the case of a
 * 429 rate limit, completely empty) into a clear, actionable message so ordinary
 * users understand what to do next instead of hitting a silent failure.
 */
export function classifyAuthError(rawMessage: string | null | undefined, status?: number): FriendlyAuthError {
  const msg = (rawMessage || '').toLowerCase();

  if (status === 429 || msg.includes('rate limit') || msg.includes('too many') || msg.includes('429')) {
    return {
      title: 'Hold on a moment',
      message: 'Too many attempts right now. Please wait about a minute and try again.',
    };
  }
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
    return {
      title: 'Account already exists',
      message: 'An account with this email is already registered. Try signing in, or use “Forgot password?” to reset it.',
    };
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return {
      title: 'Sign in failed',
      message: 'That email and password don’t match. Double-check them, or reset your password.',
    };
  }
  if (
    msg.includes('email not confirmed') ||
    msg.includes('not been confirmed') ||
    msg.includes('confirm your email') ||
    msg.includes('not confirmed')
  ) {
    return {
      title: 'Confirm your email',
      message: 'Please tap the confirmation link we emailed you first. Check your spam folder, then sign in again.',
    };
  }
  if (
    msg.includes('password should be at least') ||
    msg.includes('length of password') ||
    msg.includes('at least 6') ||
    msg.includes('at least 8')
  ) {
    return {
      title: 'Password too short',
      message: 'Please choose a password with at least 8 characters.',
    };
  }
  if (msg.includes('email address is invalid') || msg.includes('invalid email') || msg.includes('provide a valid email')) {
    return {
      title: 'Check your email address',
      message: 'Please enter a valid email address, for example name@example.com.',
    };
  }
  if (msg.includes('sign-ups are not allowed') || msg.includes('sign-ups not allowed') || msg.includes('disabled for this instance')) {
    return {
      title: 'Sign-ups are closed',
      message: 'New account creation is currently disabled for this app. Please try again later.',
    };
  }
  if (
    msg.includes('provider is not enabled') ||
    msg.includes('unsupported provider') ||
    msg.includes('provider is disabled')
  ) {
    return {
      title: 'This sign-in option is unavailable',
      message: 'Google sign-in has not been enabled for this app yet. Please sign in with your email and password instead.',
    };
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('could not connect') || msg.includes('timeout')) {
    return {
      title: 'No connection',
      message: 'We couldn’t reach the server. Check your internet connection and try again.',
    };
  }
  return {
    title: 'Something went wrong',
    message: (rawMessage || '').trim() || 'Please try again. If the problem continues, check your connection.',
  };
}
