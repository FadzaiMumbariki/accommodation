import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { aiSearch, generateListingDescription } from './ai';
import { ZIMBABWE_CITIES } from '../constants/locations';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const invokeMock = supabase!.functions.invoke as unknown as jest.Mock<
  (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>
>;

beforeEach(() => {
  invokeMock.mockReset();
});

describe('aiSearch', () => {
  // Regression: the model's city must never override an explicit city in the
  // query, otherwise "houses in Gweru" could return listings from another city.
  it('keeps the city the user typed even when the model returns a different one', async () => {
    invokeMock.mockResolvedValue({
      data: { city: 'Harare', summary: 'Houses in Harare' },
      error: null,
    });

    const result = await aiSearch('houses in Gweru', ZIMBABWE_CITIES);

    expect(result.source).toBe('ai');
    expect(result.filters.city).toBe('Gweru');
    expect(result.summary).toContain('Gweru');
  });

  it('reports an Edge Function failure when it falls back to local search', async () => {
    invokeMock.mockRejectedValue(new Error('network unavailable'));

    const result = await aiSearch('houses in Bindura', ZIMBABWE_CITIES);

    expect(result.source).toBe('basic');
    expect(result.unavailable).toBe('outage');
    expect(result.filters.city).toBe('Bindura');
  });
});

describe('generateListingDescription', () => {
  it('uses only supplied facts in the local fallback', async () => {
    const result = await generateListingDescription({
      title: 'Avondale Cottage',
      propertyType: 'cottage',
      city: 'Harare',
      suburb: 'Avondale',
      bedrooms: 1,
      bathrooms: 1,
      price: 250,
      amenities: ['Solar'],
    });

    expect(result.source).toBe('basic');
    expect(result.description).toContain('Avondale Cottage');
    expect(result.description).toContain('Solar');
    expect(result.description).not.toMatch(/peaceful|secure|public transport|shopping center/i);
  });
});
