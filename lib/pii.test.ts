import { describe, expect, it } from '@jest/globals';
import { stripPii, sanitizePiiValue } from '../supabase/functions/_shared/pii';

describe('stripPii', () => {
  it('redacts email addresses', () => {
    expect(stripPii('Contact me at jane.doe@example.com')).toBe('Contact me at [REDACTED_EMAIL]');
  });

  it('redacts Zimbabwean phone numbers in local and international format', () => {
    expect(stripPii('Call 0771234567')).toBe('Call [REDACTED_PHONE]');
    expect(stripPii('Call +263 77 123 4567')).toBe('Call [REDACTED_PHONE]');
    expect(stripPii('Reach us on (0242) 700100')).toBe('Reach us on [REDACTED_PHONE]');
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

  it('does NOT redact plain sequences of numbers like 300 300 300', () => {
    expect(stripPii('Dimensions are 300 300 300 mm')).toBe('Dimensions are 300 300 300 mm');
    expect(stripPii('Looking for 200 300 or 400')).toBe('Looking for 200 300 or 400');
  });

  it('returns an empty string for empty input', () => {
    expect(stripPii('')).toBe('');
  });
});

describe('sanitizePiiValue', () => {
  it('cleans replies containing PII across nested objects and arrays', () => {
    const reply = {
      description: 'Call 0771234567 for inquiries',
      notes: ['Email me at test@example.com', 'Clean note'],
      count: 3,
    };
    const cleaned = sanitizePiiValue(reply);
    expect(cleaned).toEqual({
      description: 'Call [REDACTED_PHONE] for inquiries',
      notes: ['Email me at [REDACTED_EMAIL]', 'Clean note'],
      count: 3,
    });
  });
});
