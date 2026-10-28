import { describe, expect, it, jest } from '@jest/globals';
import type { Property } from '../types';
import { matchRequestToListings } from './smartMatching';

jest.mock('./supabase', () => ({ supabase: null }));

const property = (id: string, availableFromDate?: string, available = true): Property => ({
  id,
  title: `Listing ${id}`,
  propertyType: 'house',
  price: 400,
  city: 'Harare',
  suburb: 'Avondale',
  province: 'Harare',
  bedrooms: 2,
  bathrooms: 1,
  maxOccupants: 4,
  images: [],
  amenities: [],
  description: 'A rental listing.',
  landlord: {
    id: 'landlord-1',
    name: 'Landlord',
    phone: '',
    verified: false,
  },
  available,
  availabilityStatus: availableFromDate ? 'available_from' : 'available_now',
  availableFromDate,
  verified: false,
  postedAt: '2025-01-01',
});

describe('matchRequestToListings', () => {
  it('excludes listings unavailable by the requested move-in date', async () => {
    const results = await matchRequestToListings(
      {
        city: 'Harare',
        minBudget: 0,
        maxBudget: 500,
        moveInDate: '2026-12-01',
      },
      [
        property('available-now'),
        property('available-later', '2027-01-01'),
        property('unavailable', undefined, false),
      ],
    );

    expect(results.map((result) => result.property.id)).toEqual(['available-now']);
  });

  it('explains when a listing will be available by the requested date', async () => {
    const results = await matchRequestToListings(
      {
        city: 'Harare',
        minBudget: 0,
        maxBudget: 500,
        moveInDate: '2026-12-01',
      },
      [property('available-soon', '2026-11-15')],
    );

    expect(results[0].matchReasons).toContain('Available by 2026-12-01');
  });
});
