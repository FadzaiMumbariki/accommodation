import { describe, expect, it, jest } from '@jest/globals';

import { rowToProperty } from './database';
jest.mock('./supabase', () => ({ supabase: null }));

describe('rowToProperty', () => {
  it('maps database values without inventing landlord metrics', () => {
    const property = rowToProperty({
      id: 'property-1',
      landlord_id: 'landlord-1',
      title: 'Central apartment',
      property_type: 'apartment',
      price: '450',
      deposit: null,
      city: 'Harare',
      suburb: 'Avondale',
      province: 'Harare Province',
      address: null,
      bedrooms: 2,
      bathrooms: 1,
      max_occupants: 4,
      images: ['https://example.com/photo.jpg'],
      amenities: ['water'],
      description: null,
      available: true,
      availability_status: 'available_now',
      available_from_date: null,
      verified: false,
      rating: null,
      reviews_count: null,
      lat: null,
      lng: null,
      created_at: '2026-01-01T00:00:00Z',
      profiles: {
        full_name: 'Landlord One',
        avatar_url: null,
        phone: '+263771234567',
      },
    });

    expect(property.price).toBe(450);
    expect(property.rating).toBeUndefined();
    expect(property.landlord).toEqual({
      id: 'landlord-1',
      name: 'Landlord One',
      avatar: undefined,
      phone: '+263771234567',
      verified: false,
    });
    expect(property.landlord.responseTime).toBeUndefined();
    expect(property.landlord.rating).toBeUndefined();
    expect(property.landlord.totalListings).toBeUndefined();
  });
});
