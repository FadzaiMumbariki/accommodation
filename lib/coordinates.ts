/**
 * ImbaFind — Geographic Coordinates Registry for Zimbabwe
 *
 * Provides approximate coordinates for cities and suburbs across Zimbabwe
 * so properties can be accurately plotted on interactive maps.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default center: Harare CBD
export const DEFAULT_MAP_CENTER: Coordinates = {
  latitude: -17.8252,
  longitude: 31.0335,
};

// Suburb-specific coordinates (Harare, Bulawayo, etc.)
export const SUBURB_COORDINATES: Record<string, Coordinates> = {
  // Harare suburbs
  'avondale': { latitude: -17.7885, longitude: 31.0384 },
  'avondale west': { latitude: -17.7820, longitude: 31.0290 },
  'mount pleasant': { latitude: -17.7712, longitude: 31.0494 },
  'belgravia': { latitude: -17.8010, longitude: 31.0450 },
  'borrowdale': { latitude: -17.7490, longitude: 31.0950 },
  'borrowdale west': { latitude: -17.7450, longitude: 31.0820 },
  'eastlea': { latitude: -17.8280, longitude: 31.0740 },
  'milton park': { latitude: -17.8100, longitude: 31.0250 },
  'alexandra park': { latitude: -17.7920, longitude: 31.0600 },
  'cbd': { latitude: -17.8292, longitude: 31.0522 },
  'harare cbd': { latitude: -17.8292, longitude: 31.0522 },
  'marlborough': { latitude: -17.7450, longitude: 31.0020 },
  'westgate': { latitude: -17.7650, longitude: 30.9850 },
  'glen view': { latitude: -17.8920, longitude: 30.9450 },
  'highfield': { latitude: -17.8800, longitude: 30.9900 },
  'mabelreign': { latitude: -17.7850, longitude: 30.9980 },
  'greendale': { latitude: -17.8180, longitude: 31.1150 },
  'hatfield': { latitude: -17.8820, longitude: 31.0780 },
  'waterfalls': { latitude: -17.9050, longitude: 31.0450 },
  'ruwa': { latitude: -17.8910, longitude: 31.2450 },
  'chitungwiza': { latitude: -18.0127, longitude: 31.0756 },
  'st marys': { latitude: -18.0050, longitude: 31.0650 },
  'seke': { latitude: -18.0300, longitude: 31.0890 },
  'unit l': { latitude: -18.0200, longitude: 31.0920 },
  'zengeni': { latitude: -18.0100, longitude: 31.0700 },

  // Bulawayo suburbs
  'hillside': { latitude: -20.1850, longitude: 28.6010 },
  'kumalo': { latitude: -20.1550, longitude: 28.6100 },
  'suburbs': { latitude: -20.1600, longitude: 28.5950 },
  'morningside': { latitude: -20.1950, longitude: 28.5900 },
  'bradfield': { latitude: -20.1750, longitude: 28.5900 },
  'woodville': { latitude: -20.1150, longitude: 28.6550 },
  'cowdray park': { latitude: -20.0950, longitude: 28.4850 },
  'nkulumane': { latitude: -20.2100, longitude: 28.5150 },
  'luveve': { latitude: -20.1250, longitude: 28.5100 },
  'bulawayo cbd': { latitude: -20.1550, longitude: 28.5850 },

  // Gweru suburbs
  'daylesford': { latitude: -19.4850, longitude: 29.8450 },
  'harben park': { latitude: -19.4600, longitude: 29.8350 },
  'lundi park': { latitude: -19.4450, longitude: 29.8150 },
  'mkoba': { latitude: -19.4350, longitude: 29.7650 },
  'gweru cbd': { latitude: -19.4520, longitude: 29.8170 },

  // Mutare suburbs
  'morningside mutare': { latitude: -18.9650, longitude: 32.6650 },
  'yeovil': { latitude: -18.9950, longitude: 32.6500 },
  'chikanga': { latitude: -18.9750, longitude: 32.6150 },
  'dangamvura': { latitude: -19.0300, longitude: 32.6100 },
  'mutare cbd': { latitude: -18.9758, longitude: 32.6504 },

  // Masvingo suburbs
  'rhodesville masvingo': { latitude: -20.0650, longitude: 30.8350 },
  'target kopje': { latitude: -20.0820, longitude: 30.8250 },
  'mucheke': { latitude: -20.0850, longitude: 30.8100 },
  'masvingo cbd': { latitude: -20.0744, longitude: 30.8277 },

  // Chinhoyi suburbs
  'chikonohono': { latitude: -17.3750, longitude: 30.1900 },
  'cold stream': { latitude: -17.3550, longitude: 30.2100 },
  'chinhoyi cbd': { latitude: -17.3667, longitude: 30.2000 },
};

// City-level coordinates fallback
export const CITY_COORDINATES: Record<string, Coordinates> = {
  'harare': { latitude: -17.8252, longitude: 31.0335 },
  'chitungwiza': { latitude: -18.0127, longitude: 31.0756 },
  'bulawayo': { latitude: -20.1500, longitude: 28.5833 },
  'gweru': { latitude: -19.4500, longitude: 29.8167 },
  'mutare': { latitude: -18.9758, longitude: 32.6504 },
  'kwekwe': { latitude: -18.9281, longitude: 29.8149 },
  'kadoma': { latitude: -18.3333, longitude: 29.9167 },
  'masvingo': { latitude: -20.0744, longitude: 30.8277 },
  'chinhoyi': { latitude: -17.3667, longitude: 30.2000 },
  'norton': { latitude: -17.8833, longitude: 30.7000 },
  'marondera': { latitude: -18.1856, longitude: 31.5519 },
  'bindura': { latitude: -17.3000, longitude: 31.3333 },
  'victoria falls': { latitude: -17.9333, longitude: 25.8333 },
  'hwange': { latitude: -18.3647, longitude: 26.4988 },
  'zvishavane': { latitude: -20.3333, longitude: 30.0667 },
  'rusape': { latitude: -18.5333, longitude: 32.1167 },
  'kariba': { latitude: -16.5167, longitude: 28.8000 },
  'chegutu': { latitude: -18.1306, longitude: 30.1408 },
};

/**
 * Mapping of known Zimbabwean suburbs to their parent city.
 */
export const SUBURB_TO_CITY: Record<string, string> = {
  // Harare
  'avondale': 'Harare',
  'avondale west': 'Harare',
  'mount pleasant': 'Harare',
  'belgravia': 'Harare',
  'borrowdale': 'Harare',
  'borrowdale west': 'Harare',
  'borrowdale brook': 'Harare',
  'eastlea': 'Harare',
  'milton park': 'Harare',
  'alexandra park': 'Harare',
  'harare cbd': 'Harare',
  'marlborough': 'Harare',
  'westgate': 'Harare',
  'glen view': 'Harare',
  'highfield': 'Harare',
  'mabelreign': 'Harare',
  'greendale': 'Harare',
  'hatfield': 'Harare',
  'waterfalls': 'Harare',
  'warren park': 'Harare',
  'mbare': 'Harare',
  'ruwa': 'Harare',

  // Chitungwiza
  'chitungwiza': 'Chitungwiza',
  'st marys': 'Chitungwiza',
  'seke': 'Chitungwiza',
  'unit l': 'Chitungwiza',
  'zengeni': 'Chitungwiza',

  // Bulawayo
  'hillside': 'Bulawayo',
  'kumalo': 'Bulawayo',
  'khumalo': 'Bulawayo',
  'suburbs': 'Bulawayo',
  'morningside': 'Bulawayo',
  'bradfield': 'Bulawayo',
  'woodville': 'Bulawayo',
  'cowdray park': 'Bulawayo',
  'nkulumane': 'Bulawayo',
  'luveve': 'Bulawayo',
  'pumula': 'Bulawayo',
  'makokoba': 'Bulawayo',
  'waterford': 'Bulawayo',
  'riverside': 'Bulawayo',
  'nketa': 'Bulawayo',
  'sunningdale': 'Bulawayo',
  'bulawayo cbd': 'Bulawayo',

  // Gweru
  'daylesford': 'Gweru',
  'harben park': 'Gweru',
  'lundi park': 'Gweru',
  'mkoba': 'Gweru',
  'ascot': 'Gweru',
  'senga': 'Gweru',
  'southdowns': 'Gweru',
  'gweru cbd': 'Gweru',

  // Mutare
  'chikanga': 'Mutare',
  'dangamvura': 'Mutare',
  'sakubva': 'Mutare',
  'murambi': 'Mutare',
  'hobhouse': 'Mutare',
  'yeovil': 'Mutare',
  'mutare cbd': 'Mutare',

  // Masvingo
  'rhodene': 'Masvingo',
  'mucheke': 'Masvingo',
  'rujeko': 'Masvingo',
  'target kopje': 'Masvingo',
  'masvingo cbd': 'Masvingo',

  // Chinhoyi
  'chikonohono': 'Chinhoyi',
  'cold stream': 'Chinhoyi',
  'chinhoyi cbd': 'Chinhoyi',
};

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLon = (coord2.longitude - coord1.longitude) * (Math.PI / 180);
  const lat1 = coord1.latitude * (Math.PI / 180);
  const lat2 = coord2.latitude * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;

  return Math.round(km * 10) / 10;
}

/**
 * Formats a distance in kilometers to a user-friendly string (e.g. "800m away" or "2.4 km away").
 */
export function formatDistance(km?: number | null): string {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `${meters}m away`;
  }
  return `${km.toFixed(1)} km away`;
}

/**
 * Resolves a coordinate reference from a free text query, city, or suburb.
 */
export function resolveLocationCoordinates(
  queryOrLocation?: string,
  city?: string,
  suburb?: string,
): Coordinates | null {
  if (suburb) {
    const norm = suburb.trim().toLowerCase();
    if (SUBURB_COORDINATES[norm]) return SUBURB_COORDINATES[norm];
  }
  if (city) {
    const norm = city.trim().toLowerCase();
    if (CITY_COORDINATES[norm]) return CITY_COORDINATES[norm];
  }
  if (queryOrLocation) {
    const norm = queryOrLocation.trim().toLowerCase();
    // Suburb match
    for (const [sub, coords] of Object.entries(SUBURB_COORDINATES)) {
      if (norm.includes(sub)) return coords;
    }
    // City match
    for (const [c, coords] of Object.entries(CITY_COORDINATES)) {
      if (norm.includes(c)) return coords;
    }
  }
  return null;
}

/**
 * Resolves latitude and longitude for a property based on its suburb, city, and a pseudo-hash
 * of its ID so multiple listings in the same suburb don't overlap completely on the map.
 */
export function getPropertyCoordinates(
  city: string,
  suburb: string,
  id: string = '',
): Coordinates {
  const normSuburb = (suburb || '').trim().toLowerCase();
  const normCity = (city || '').trim().toLowerCase();

  let base = SUBURB_COORDINATES[normSuburb] || CITY_COORDINATES[normCity] || DEFAULT_MAP_CENTER;

  // Add a slight jitter based on id to prevent marker collision
  if (id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const latOffset = ((hash % 100) / 100) * 0.007; // ~700 meters max jitter
    const lngOffset = (((hash >> 8) % 100) / 100) * 0.007;
    return {
      latitude: base.latitude + latOffset,
      longitude: base.longitude + lngOffset,
    };
  }

  return base;
}

/**
 * Sorts an array of properties by proximity to reference coordinates.
 * Attaches the calculated `distanceKm` to each property.
 */
export function sortByProximity<T extends { city: string; suburb: string; id?: string; coordinates?: { lat: number; lng: number } }>(
  items: T[],
  referenceCoords: Coordinates,
  maxDistanceKm?: number,
): (T & { distanceKm: number })[] {
  const withDistance = items.map(item => {
    const itemCoords: Coordinates = item.coordinates
      ? { latitude: item.coordinates.lat, longitude: item.coordinates.lng }
      : getPropertyCoordinates(item.city, item.suburb, item.id || '');
    const distanceKm = calculateDistanceKm(referenceCoords, itemCoords);
    return { ...item, distanceKm };
  });

  const filtered = typeof maxDistanceKm === 'number' && maxDistanceKm > 0
    ? withDistance.filter(i => i.distanceKm <= maxDistanceKm)
    : withDistance;

  return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
}

