import { describe, expect, it, jest } from '@jest/globals';
import { generateListingDescription } from './ai';

jest.mock('./supabase', () => ({ supabase: null }));

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
