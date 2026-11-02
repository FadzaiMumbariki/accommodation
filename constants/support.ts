/**
 * Support contact details come from the environment so that no placeholder
 * phone number, WhatsApp line or email address is ever bundled into a release
 * build. Set the `EXPO_PUBLIC_SUPPORT_*` variables in `.env.local` and in the
 * EAS `preview` / `production` environments (see `.env.example` and README).
 *
 * A contact channel with no configured value is treated as unavailable, and the
 * UI hides it rather than showing a number that does not work.
 */
const phone = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '';
const whatsapp = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '';
const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';

export const SUPPORT_CONTACT = {
  phone,
  whatsapp,
  email,
  businessHours: process.env.EXPO_PUBLIC_SUPPORT_HOURS ?? '8am - 6pm CAT',
  hasPhone: phone.length > 0,
  hasWhatsapp: whatsapp.length > 0,
  hasEmail: email.length > 0,
} as const;

/** True when at least one contact channel is configured. */
export const hasSupportContact =
  SUPPORT_CONTACT.hasPhone || SUPPORT_CONTACT.hasWhatsapp || SUPPORT_CONTACT.hasEmail;
