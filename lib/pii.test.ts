import { describe, expect, it } from '@jest/globals';
import { stripPii } from '../supabase/functions/_shared/pii';

describe('stripPii', () => {
  it('redacts email addresses', () => {
    expect(stripPii('Contact me at jane.doe@example.com')).toBe('Contact me at [REDACTED_EMAIL]');
  });

  it('redacts Zimbabwean phone numbers in local and international format', () => {
    expect(stripPii('Call 0771234567')).toBe('Call [REDACTED_PHONE]');
    expect(stripPii('Call +263 77 123 4567')).toBe('Call [REDACTED_PHONE]');
  });

  it('redacts standalone long numeric identifiers as numbers, not phones', () => {
    expect(stripPii('Ref 1234567890123')).toBe('Ref [REDACTED_NUMBER]');
  });

  it('redacts a generic international phone number', () => {
    expect(stripPii('Reach me on +1 (555) 123-4567')).toBe('Reach me on [REDACTED_PHONE]');
  });

  it('leaves ordinary listing text untouched', () => {
    const text = 'Spacious 3 bedroom house in Avondale with 2 bathrooms, 500 USD per month.';
    expect(stripPii(text)).toBe(text);
  });

  it('returns an empty string for empty input', () => {
    expect(stripPii('')).toBe('');
  });
});
