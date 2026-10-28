import { describe, expect, it, jest } from '@jest/globals';
import type { Property } from '../types';
import { evaluateListingRules } from './trustCheck';

jest.mock('./supabase', () => ({ supabase: null }));

const listing: Property = {
  id: 'listing-1',
  title: 'Three bedroom home',
  propertyType: 'house',
  price: 600,
  city: 'Harare',
  suburb: 'Avondale',
  province: 'Harare',
  bedrooms: 3,
  bathrooms: 2,
  maxOccupants: 5,
  images: ['https://example.com/house.jpg'],
  amenities: ['Solar', 'Borehole'],
  description:
    'Spacious family home with solar backup, borehole water, secure parking, fitted kitchen and garden near shops.',
  landlord: {
    id: 'landlord-1',
    name: 'Landlord',
    phone: '',
    verified: true,
  },
  available: true,
  verified: true,
  postedAt: '2025-01-01',
};

describe('evaluateListingRules', () => {
  it('flags a description closely reused by another listing', () => {
    const similarListing = { ...listing, id: 'listing-2' };

    const result = evaluateListingRules(listing, [listing, similarListing]);

    expect(result.flags).toContainEqual(
      expect.objectContaining({ title: 'Possible Reused Description', severity: 'medium' }),
    );
  });

  it('does not compare a listing against itself', () => {
    const result = evaluateListingRules(listing, [listing]);

    expect(result.flags).not.toContainEqual(
      expect.objectContaining({ title: 'Possible Reused Description' }),
    );
  });

  it('flags a price far below the median of similar active listings', () => {
    const underpriced = { ...listing, price: 250 };
    const comparables = [600, 700, 800].map((price, index) => ({
      ...listing,
      id: `comparable-${index}`,
      price,
      description: `Unique description ${index} with separate details about this rental.`,
    }));

    const result = evaluateListingRules(underpriced, [underpriced, ...comparables]);

    expect(result.priceAnalysis.isUnusuallyLow).toBe(true);
    expect(result.priceAnalysis.typicalRange).toEqual({ min: 600, max: 800 });
  });
});
