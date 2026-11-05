import { SUPPORT_CONTACT as ENV_SUPPORT_CONTACT } from './envConfig';

/**
 * Support contact details come from the environment so that no placeholder
 * phone number, WhatsApp line or email address is ever bundled into a release
 * build. Set the `EXPO_PUBLIC_SUPPORT_*` variables in `.env.local` and in the
 * EAS `preview` / `production` environments (see `.env.example` and README).
 *
 * A contact channel with no configured value is treated as unavailable, and the
 * UI hides it rather than showing a number that does not work.
 */

// Re-export from centralized config for backward compatibility
export const SUPPORT_CONTACT = ENV_SUPPORT_CONTACT;

/** True when at least one contact channel is configured. */
export const hasSupportContact =
  SUPPORT_CONTACT.hasPhone || SUPPORT_CONTACT.hasWhatsapp || SUPPORT_CONTACT.hasEmail;
