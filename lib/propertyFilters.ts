import type { Property, PropertyFilters, PropertyType } from '../types';
import {
  DEFAULT_MAP_CENTER,
  resolveLocationCoordinates,
  sortByProximity,
} from './coordinates';

export function filterMockProperties(
  properties: Property[],
  filters: PropertyFilters,
): Property[] {
  const filtered = properties.filter(property => {
    if (!property.available) return false;

    // Search filter
    if (filters.search) {
      const rawSearch = filters.search.toLowerCase().trim();
      const simpleMatch = [
        property.city,
        property.suburb,
        property.title,
        property.propertyType,
        property.description || '',
      ].some(value => value.toLowerCase().includes(rawSearch));

      if (!simpleMatch) {
        // Natural language query decomposition
        const tokens = rawSearch
          .split(/[\s,/-]+/)
          .map(t => t.replace(/[^a-z0-9]/g, ''))
          .filter(t => t.length > 0 && !['in', 'or', 'and', 'the', 'a', 'near', 'nearby', 'for', 'to', 'of'].includes(t));

        if (tokens.length > 0) {
          // Check if property matches the tokens
          const matchesAnyToken = tokens.some(token => {
            const singular = token.replace(/s$/, '');
            if (['house', 'apartment', 'flat', 'room', 'cottage', 'bedsitter'].includes(singular)) {
              if (singular === 'apartment') {
                return property.propertyType === 'apartment' || property.propertyType === 'flat';
              }
              return property.propertyType === singular;
            }
            return [
              property.city,
              property.suburb,
              property.title,
              property.propertyType,
              property.description || '',
            ].some(value => value.toLowerCase().includes(token));
          });

          if (!matchesAnyToken) return false;
        }
      }
    }

    if (filters.city && property.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.suburb && property.suburb.toLowerCase() !== filters.suburb.toLowerCase()) return false;
    if (filters.province && property.province.toLowerCase() !== filters.province.toLowerCase()) return false;

    // Multiple property types support (e.g. ['house', 'apartment'])
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      if (!filters.propertyTypes.includes(property.propertyType as PropertyType)) return false;
    } else {
      const propertyType = filters.propertyType;
      if (
        propertyType &&
        propertyType !== 'any' &&
        propertyType !== 'all' &&
        property.propertyType !== propertyType
      ) return false;
    }

    if (typeof filters.bedrooms === 'number' && property.bedrooms < filters.bedrooms) return false;
    if (typeof filters.bathrooms === 'number' && property.bathrooms < filters.bathrooms) return false;
    if (filters.budgetMin != null && property.price < filters.budgetMin) return false;
    if (filters.budgetMax != null && property.price > filters.budgetMax) return false;
    if (filters.availableNowOnly && property.availabilityStatus !== 'available_now') return false;

    const amenities = (property.amenities ?? []).map(amenity => amenity.toLowerCase());
    const hasFurniture = amenities.some(amenity => amenity.includes('furnish'));
    if (
      (filters.furnishedOnly || filters.furnished === true || filters.furnished === 'furnished') &&
      !hasFurniture
    ) return false;
    if (
      (filters.furnished === 'unfurnished' || filters.furnished === false) &&
      hasFurniture
    ) return false;

    const requestedAmenities = filters.selectedAmenities?.length
      ? filters.selectedAmenities
      : filters.amenities ?? [];
    if (requestedAmenities.some(
      (requested: string) => !amenities.some(amenity => amenity.includes(requested.toLowerCase())),
    )) return false;

    return true;
  });

  // Apply proximity sorting if nearby is requested or if reference coordinates exist
  const refCoords =
    filters.referenceCoordinates ||
    (filters.nearby
      ? resolveLocationCoordinates(filters.search, filters.city, filters.suburb) || DEFAULT_MAP_CENTER
      : resolveLocationCoordinates(filters.search, filters.city, filters.suburb));

  if (refCoords) {
    const sorted = sortByProximity(filtered, refCoords, filters.searchRadius);
    return sorted;
  }

  return filtered;
}
