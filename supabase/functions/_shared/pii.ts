// PII redaction for ImbaFind AI Edge Functions (Deno runtime).
//
// This module is deliberately dependency-free and free of Deno globals so it can
// be unit-tested without the Deno runtime (see lib/pii.test.ts). gemini.ts
// re-exports `stripPii` so the Edge Functions keep importing it from one place.

/**
 * Strips phone numbers, email addresses, and numerical identifiers from text
 * before sending to Gemini, strictly honoring privacy guarantees.
 */
export function stripPii(text: string): string {
  if (!text) return '';
  return text
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    // Redact Zimbabwean phone numbers (+263 7x, 07x, etc.)
    .replace(/(?:\+263|263|0)[\s.-]?(?:7[1378]|86)[\s.-]?\d{3}[\s.-]?\d{4}/g, '[REDACTED_PHONE]')
    // Redact standalone sequences of 9 to 13 digits (reference ids, account numbers)
    .replace(/\b\d{9,13}\b/g, '[REDACTED_NUMBER]')
    // Redact general international phone formats. Runs last so bare digit runs are
    // labelled as numbers rather than phones.
    .replace(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, '[REDACTED_PHONE]');
}
