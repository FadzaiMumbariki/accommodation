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

  it('filters by multiple property types (e.g. houses and apartments)', () => {
    const results = filterMockProperties(MOCK_PROPERTIES, {
      city: 'Harare',
      propertyTypes: ['house', 'apartment'],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.propertyType === 'house')).toBe(true);
    expect(results.some(p => p.propertyType === 'apartment')).toBe(true);
    expect(results.every(p => p.propertyType === 'house' || p.propertyType === 'apartment')).toBe(true);
  });

  it('handles natural search queries like "nearby houses or apartments"', () => {
    const results = filterMockProperties(MOCK_PROPERTIES, {
      search: 'nearby houses or apartments',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.propertyType === 'house')).toBe(true);
    expect(results.some(p => p.propertyType === 'apartment')).toBe(true);
  });

  it('attaches distanceKm and sorts by proximity when nearby is requested', () => {
    const results = filterMockProperties(MOCK_PROPERTIES, {
      nearby: true,
      city: 'Harare',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].distanceKm).toBe('number');
    for (let i = 1; i < results.length; i++) {
      expect((results[i].distanceKm ?? 0)).toBeGreaterThanOrEqual(results[i - 1].distanceKm ?? 0);
    }
  });
});

