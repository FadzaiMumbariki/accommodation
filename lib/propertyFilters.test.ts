import { describe, expect, it } from '@jest/globals';
import { filterMockProperties } from './propertyFilters';
import { MOCK_PROPERTIES } from '../constants/mockData';

describe('filterMockProperties', () => {
  it('matches the requested city, bedroom minimum, and budget', () => {
    const results = filterMockProperties(MOCK_PROPERTIES, {
      city: 'Harare',
      bedrooms: 2,
      budgetMax: 400,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(property =>
      property.city === 'Harare' && property.bedrooms >= 2 && property.price <= 400,
    )).toBe(true);
  });

  it('does not treat a kitchen amenity as evidence that a property is furnished', () => {
    const kitchenOnlyProperty = {
      ...MOCK_PROPERTIES[0],
      id: 'kitchen-only',
      amenities: ['kitchen'],
    };

    expect(filterMockProperties([kitchenOnlyProperty], { furnished: true })).toEqual([]);
  });
});
