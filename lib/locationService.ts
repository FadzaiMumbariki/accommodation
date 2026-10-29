import * as Location from 'expo-location';
import {
  calculateDistanceKm,
  Coordinates,
  SUBURB_COORDINATES,
  CITY_COORDINATES,
  SUBURB_TO_CITY,
} from './coordinates';

export interface LocationResult {
  coords: Coordinates;
  accuracy?: number | null;
  status: 'granted' | 'denied' | 'unavailable' | 'error';
  errorMessage?: string;
}

export interface NearestLocationMatch {
  name: string;
  city: string;
  suburb?: string;
  distanceKm: number;
  coordinates: Coordinates;
  isWithinZimbabwe: boolean;
}

/**
 * Requests location permission and returns the current user device coordinates.
 * Supports cross-platform execution (iOS, Android, and Web).
 */
export async function getCurrentUserLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return {
        coords: { latitude: 0, longitude: 0 },
        status: 'denied',
        errorMessage: 'Location permission was denied by the user.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      accuracy: position.coords.accuracy,
      status: 'granted',
    };
  } catch (err: unknown) {
    // Web fallback if expo-location encountered browser permissions / environment quirks
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.geolocation) {
      try {
        const webCoords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => resolve(pos.coords),
            e => reject(e),
            { timeout: 10000, maximumAge: 60000 }
          );
        });
        return {
          coords: {
            latitude: webCoords.latitude,
            longitude: webCoords.longitude,
          },
          accuracy: webCoords.accuracy,
          status: 'granted',
        };
      } catch {
        // Fall through to error return below
      }
    }

    const message = err instanceof Error ? err.message : 'Failed to retrieve current device location';
    return {
      coords: { latitude: 0, longitude: 0 },
      status: 'error',
      errorMessage: message,
    };
  }
}

/**
 * Resolves the closest Zimbabwean suburb or city center to a given set of coordinates.
 */
export function findNearestLocation(coords: Coordinates): NearestLocationMatch | null {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return null;
  }

  let bestMatch: NearestLocationMatch | null = null;
  let minDistance = Infinity;

  // 1. Check known suburbs
  for (const [suburbKey, suburbCoords] of Object.entries(SUBURB_COORDINATES)) {
    const dist = calculateDistanceKm(coords, suburbCoords);
    if (dist < minDistance) {
      minDistance = dist;
      const parentCity = SUBURB_TO_CITY[suburbKey] || 'Harare';
      const capitalizedSuburb = suburbKey
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      bestMatch = {
        name: `${capitalizedSuburb}, ${parentCity}`,
        city: parentCity,
        suburb: capitalizedSuburb,
        distanceKm: Math.round(dist * 10) / 10,
        coordinates: suburbCoords,
        isWithinZimbabwe: dist <= 120, // reasonable radius for regional coverage
      };
    }
  }

  // 2. Check known city centers
  for (const [cityKey, cityCoords] of Object.entries(CITY_COORDINATES)) {
    const dist = calculateDistanceKm(coords, cityCoords);
    if (dist < minDistance) {
      minDistance = dist;
      const capitalizedCity = cityKey
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      bestMatch = {
        name: capitalizedCity,
        city: capitalizedCity,
        distanceKm: Math.round(dist * 10) / 10,
        coordinates: cityCoords,
        isWithinZimbabwe: dist <= 150,
      };
    }
  }

  return bestMatch;
}

/**
 * Generates a human-friendly description of the detected location.
 */
export function formatLocationLabel(match: NearestLocationMatch | null): string {
  if (!match) return 'Current Location';
  if (match.distanceKm < 1) {
    return match.suburb ? `${match.suburb}, ${match.city}` : match.city;
  }
  if (match.distanceKm <= 5) {
    return `Near ${match.name}`;
  }
  return `Within ${Math.round(match.distanceKm)} km of ${match.name}`;
}
