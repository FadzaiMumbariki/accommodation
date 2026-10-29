import type { Property, PropertyFilters } from '../types';

export function filterMockProperties(
  properties: Property[],
  filters: PropertyFilters,
): Property[] {
  return properties.filter(property => {
    if (!property.available) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase().trim();
      if (search && ![
        property.city,
        property.suburb,
        property.title,
        property.propertyType,
        property.description,
      ].some(value => value.toLowerCase().includes(search))) return false;
    }
    if (filters.city && property.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.suburb && property.suburb.toLowerCase() !== filters.suburb.toLowerCase()) return false;
    if (filters.province && property.province.toLowerCase() !== filters.province.toLowerCase()) return false;

    const propertyType = filters.propertyType;
    if (
      propertyType &&
      propertyType !== 'any' &&
      propertyType !== 'all' &&
      property.propertyType !== propertyType
    ) return false;

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
}
