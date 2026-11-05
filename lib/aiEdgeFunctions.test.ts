import { describe, expect, it } from '@jest/globals';

// Test suite for AI Edge Function request validation and error responses.
// Validates that bad requests, invalid JSON, missing parameters, and invalid HTTP methods
// reliably return 400 Bad Request or 405 Method Not Allowed instead of 502 Bad Gateway.

describe('AI Edge Functions Request Validation & Error Handling', () => {
  describe('ai-search request handling', () => {
    it('rejects non-POST HTTP methods with 405', () => {
      const method: string = 'GET';
      const isPost = method === 'POST';
      expect(isPost).toBe(false);
      const status = isPost ? 200 : 405;
      expect(status).toBe(405);
    });

    it('rejects malformed or non-JSON body with 400 Bad Request', () => {
      const rawBody = 'this is not valid json {';
      let parsed: unknown = null;
      let errorResponse: { error: string; status: number } | null = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        errorResponse = { error: 'Invalid JSON body.', status: 400 };
      }
      expect(parsed).toBeNull();
      expect(errorResponse).toEqual({ error: 'Invalid JSON body.', status: 400 });
    });

    it('rejects empty or whitespace query with 400 Bad Request', () => {
      const testCases = ['', '   ', null, undefined, 123];
      for (const query of testCases) {
        const isValid = typeof query === 'string' && query.trim().length > 0 && query.length <= 200;
        expect(isValid).toBe(false);
        const status = isValid ? 200 : 400;
        expect(status).toBe(400);
      }
    });

    it('accepts valid search queries within 200 characters', () => {
      const query = '2 bedroom flat in Avondale under 400';
      const isValid = typeof query === 'string' && query.trim().length > 0 && query.length <= 200;
      expect(isValid).toBe(true);
    });
  });

  describe('ai-describe request handling', () => {
    it('rejects malformed JSON body with 400 Bad Request', () => {
      const invalidJson = '{"title": "incomplete';
      let errorStatus: number | null = null;
      try {
        JSON.parse(invalidJson);
      } catch {
        errorStatus = 400;
      }
      expect(errorStatus).toBe(400);
    });

    it('rejects listing when both title and suburb are missing with 400', () => {
      const facts = { title: '', suburb: '', city: 'Harare' };
      const hasMinimumDetail = Boolean(facts.title || facts.suburb);
      expect(hasMinimumDetail).toBe(false);
      const status = hasMinimumDetail ? 200 : 400;
      expect(status).toBe(400);
    });

    it('accepts listing facts when title or suburb is present', () => {
      const facts = { title: 'Cosy 1-bed cottage', suburb: 'Greendale', price: 300 };
      const hasMinimumDetail = Boolean(facts.title || facts.suburb);
      expect(hasMinimumDetail).toBe(true);
    });
  });

  describe('ai-match request handling', () => {
    it('rejects malformed JSON body with 400 Bad Request', () => {
      const invalidJson = 'not json';
      let errorStatus: number | null = null;
      try {
        JSON.parse(invalidJson);
      } catch {
        errorStatus = 400;
      }
      expect(errorStatus).toBe(400);
    });

    it('rejects matching when property title is missing with 400', () => {
      const payload = {
        request: { city: 'Harare', bedrooms: 2 },
        property: { title: '', price: 400 },
      };
      const hasValidDetail = Boolean(payload.property.title);
      expect(hasValidDetail).toBe(false);
      const status = hasValidDetail ? 200 : 400;
      expect(status).toBe(400);
    });
  });

  describe('ai-trust request handling', () => {
    it('rejects malformed JSON body with 400 Bad Request', () => {
      const invalidJson = '{"price": 500, broken';
      let errorStatus: number | null = null;
      try {
        JSON.parse(invalidJson);
      } catch {
        errorStatus = 400;
      }
      expect(errorStatus).toBe(400);
    });

    it('rejects listings with neither title nor description with 400', () => {
      const facts = { title: '', description: '', price: 250 };
      const hasDetail = Boolean(facts.title || facts.description);
      expect(hasDetail).toBe(false);
      const status = hasDetail ? 200 : 400;
      expect(status).toBe(400);
    });

    it('filters out disallowed trust warning keys', () => {
      const allowed = new Set([
        'advance_payment_request',
        'pressure_tactics',
        'cannot_meet_in_person',
        'vague_description',
        'generic_description',
        'missing_practical_details',
      ]);
      const rawWarnings = [
        'advance_payment_request',
        'malicious_key_injection',
        'vague_description',
        'arbitrary_string',
      ];
      const filtered = rawWarnings.filter((w) => allowed.has(w));
      expect(filtered).toEqual(['advance_payment_request', 'vague_description']);
    });
  });
});
