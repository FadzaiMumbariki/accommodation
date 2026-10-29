import { describe, expect, it } from '@jest/globals';
import {
  calculateDistanceKm,
  formatDistance,
  resolveLocationCoordinates,
  sortByProximity,
  DEFAULT_MAP_CENTER,
  SUBURB_COORDINATES,
  CITY_COORDINATES,
} from './coordinates';
import { MOCK_PROPERTIES } from '../constants/mockData';

describe('coordinates utilities', () => {
  it('calculates Haversine distance correctly between Harare and Bulawayo (~370 km)', () => {
    const harare = CITY_COORDINATES['harare'];
    const bulawayo = CITY_COORDINATES['bulawayo'];
    const dist = calculateDistanceKm(harare, bulawayo);

    // Harare to Bulawayo is ~370-380 km straight line
    expect(dist).toBeGreaterThan(340);
    expect(dist).toBeLessThan(400);
  });

  it('calculates short distances between suburbs within Harare (Avondale to Belgravia ~1-3 km)', () => {
    const avondale = SUBURB_COORDINATES['avondale'];
    const belgravia = SUBURB_COORDINATES['belgravia'];
    const dist = calculateDistanceKm(avondale, belgravia);

    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(4);
  });

  it('formats distance in meters when < 1 km and km when >= 1 km', () => {
    expect(formatDistance(0.4)).toBe('400m away');
    expect(formatDistance(0.05)).toBe('50m away');
    expect(formatDistance(2.45)).toBe('2.5 km away');
    expect(formatDistance(12)).toBe('12.0 km away');
    expect(formatDistance(null)).toBe('');
  });

  it('resolves location coordinates from free-form text or suburb/city names', () => {
    const avondaleCoords = resolveLocationCoordinates('Looking for houses near Avondale');
    expect(avondaleCoords).toEqual(SUBURB_COORDINATES['avondale']);

    const bulawayoCoords = resolveLocationCoordinates(undefined, 'Bulawayo');
    expect(bulawayoCoords).toEqual(CITY_COORDINATES['bulawayo']);
  });

  it('sorts properties by proximity to target coordinates', () => {
    const target = SUBURB_COORDINATES['avondale'];
    const sorted = sortByProximity(MOCK_PROPERTIES, target);

    expect(sorted.length).toBe(MOCK_PROPERTIES.length);
    expect(typeof sorted[0].distanceKm).toBe('number');
    // First result should be in or right next to Avondale
    expect(sorted[0].suburb.toLowerCase()).toMatch(/avondale|belgravia|milton park|alexandra park/);

    // Sorted ascending by distance
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].distanceKm).toBeGreaterThanOrEqual(sorted[i - 1].distanceKm);
    }
  });
});
