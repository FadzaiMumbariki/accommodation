// PII redaction for ImbaFind AI Edge Functions (Deno runtime).
//
// This module is deliberately dependency-free and free of Deno globals so it can
// be unit-tested without the Deno runtime (see lib/pii.test.ts). gemini.ts
// re-exports `stripPii` and `sanitizePiiValue` so the Edge Functions keep importing from one place.

/**
 * Strips phone numbers, email addresses, and numerical identifiers from text
 * strictly honoring privacy guarantees without corrupting ordinary numeric text (e.g. "300 300 300").
 */
export function stripPii(text: string): string {
  if (!text) return '';
  return (
    text
      // Redact email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      // Redact Zimbabwean mobile & landline phone numbers (+263 7x, 07x, 086, +263 24, etc.)
      .replace(
        /(?:\+263|263|0)[\s.-]?(?:7[1378]|86|24|29|54|20)[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g,
        '[REDACTED_PHONE]',
      )
      // Redact standalone long sequences of 9 to 13 digits (reference ids, national IDs, account numbers)
      .replace(/\b\d{9,13}\b/g, '[REDACTED_NUMBER]')
      // Redact international phone formats with explicit + prefix or parenthesized area codes
      // Requires leading '+' or parenthesized area code so plain numbers like "300 300 300" are not redacted
      .replace(
        /(?:\+\d{1,4}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?|\(\d{2,5}\)[\s.-]?)\d{2,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?\b/g,
        '[REDACTED_PHONE]',
      )
  );
}

/** Recursively strips PII from all string values in an object or array */
export function sanitizePiiValue<T>(val: T): T {
  if (typeof val === 'string') {
    return stripPii(val) as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizePiiValue) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      cleaned[k] = sanitizePiiValue(v);
    }
    return cleaned as unknown as T;
  }
  return val;
}
