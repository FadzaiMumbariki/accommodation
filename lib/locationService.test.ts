import { describe, expect, it, jest } from '@jest/globals';
import * as Location from 'expo-location';
import {
  getCurrentUserLocation,
  findNearestLocation,
  formatLocationLabel,
} from './locationService';
import { SUBURB_COORDINATES, CITY_COORDINATES } from './coordinates';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

describe('locationService', () => {
  it('returns granted status and coordinates when user permits location', async () => {
    (Location.requestForegroundPermissionsAsync as jest.MockedFunction<typeof Location.requestForegroundPermissionsAsync>).mockResolvedValueOnce({
      status: Location.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    (Location.getCurrentPositionAsync as jest.MockedFunction<typeof Location.getCurrentPositionAsync>).mockResolvedValueOnce({
      coords: {
        latitude: -17.7885,
        longitude: 31.0384,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    const result = await getCurrentUserLocation();
    expect(result.status).toBe('granted');
    expect(result.coords.latitude).toBeCloseTo(-17.7885, 4);
    expect(result.coords.longitude).toBeCloseTo(31.0384, 4);
    expect(result.accuracy).toBe(10);
  });

  it('handles permission denied gracefully without throwing', async () => {
    (Location.requestForegroundPermissionsAsync as jest.MockedFunction<typeof Location.requestForegroundPermissionsAsync>).mockResolvedValueOnce({
      status: Location.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });

    const result = await getCurrentUserLocation();
    expect(result.status).toBe('denied');
    expect(result.errorMessage).toMatch(/denied/i);
  });

  it('finds nearest Zimbabwean suburb for coordinates in Harare (Avondale)', () => {
    const avondaleCoords = SUBURB_COORDINATES['avondale'];
    const match = findNearestLocation(avondaleCoords);

    expect(match).not.toBeNull();
    expect(match?.suburb?.toLowerCase()).toBe('avondale');
    expect(match?.city).toBe('Harare');
    expect(match?.distanceKm).toBeLessThan(0.1);
    expect(match?.isWithinZimbabwe).toBe(true);
  });

  it('finds nearest Zimbabwean city for Bulawayo coordinates', () => {
    const bulawayoCoords = CITY_COORDINATES['bulawayo'];
    const match = findNearestLocation(bulawayoCoords);

    expect(match).not.toBeNull();
    expect(match?.city).toMatch(/Bulawayo/i);
    expect(match?.distanceKm).toBeLessThan(1);
    expect(match?.isWithinZimbabwe).toBe(true);
  });

  it('formats location labels accurately based on distance', () => {
    const exactMatch = {
      name: 'Avondale, Harare',
      city: 'Harare',
      suburb: 'Avondale',
      distanceKm: 0.2,
      coordinates: SUBURB_COORDINATES['avondale'],
      isWithinZimbabwe: true,
    };
    expect(formatLocationLabel(exactMatch)).toBe('Avondale, Harare');

    const nearMatch = {
      name: 'Borrowdale, Harare',
      city: 'Harare',
      suburb: 'Borrowdale',
      distanceKm: 3.5,
      coordinates: SUBURB_COORDINATES['borrowdale'],
      isWithinZimbabwe: true,
    };
    expect(formatLocationLabel(nearMatch)).toBe('Near Borrowdale, Harare');

    const furtherMatch = {
      name: 'Gweru',
      city: 'Gweru',
      distanceKm: 18.2,
      coordinates: CITY_COORDINATES['gweru'],
      isWithinZimbabwe: true,
    };
    expect(formatLocationLabel(furtherMatch)).toBe('Within 18 km of Gweru');
  });
});
