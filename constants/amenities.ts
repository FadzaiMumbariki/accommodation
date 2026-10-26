import type { Amenity } from '../types';

export const AMENITIES_LIST: Amenity[] = [
  { id: 'water', name: 'Council Water', icon: 'water-outline', category: 'utility' },
  { id: 'borehole', name: 'Borehole Water', icon: 'water', category: 'utility' },
  { id: 'water_tank', name: '5000L Water Tank', icon: 'cube-outline', category: 'utility' },
  { id: 'electricity', name: 'ZESA Electricity', icon: 'flash-outline', category: 'utility' },
  { id: 'solar', name: 'Solar Backup Power', icon: 'sunny-outline', category: 'utility' },
  { id: 'security', name: '24/7 Security Guard', icon: 'shield-checkmark-outline', category: 'security' },
  { id: 'wall', name: 'Boundary Wall / Durawall', icon: 'business-outline', category: 'security' },
  { id: 'gated', name: 'Gated / Electric Gate', icon: 'lock-closed-outline', category: 'security' },
  { id: 'parking', name: 'Paved Parking', icon: 'car-outline', category: 'outdoor' },
  { id: 'garden', name: 'Garden / Yard', icon: 'leaf-outline', category: 'outdoor' },
  { id: 'furnished', name: 'Fully Furnished', icon: 'bed-outline', category: 'comfort' },
  { id: 'wifi', name: 'High-speed Wi-Fi', icon: 'wifi-outline', category: 'comfort' },
  { id: 'solar_geyser', name: 'Solar Geyser', icon: 'flame-outline', category: 'comfort' },
  { id: 'bics', name: 'Fitted Kitchen & BICs', icon: 'restaurant-outline', category: 'comfort' },
];

export const getAmenityById = (id: string): Amenity | undefined => {
  return AMENITIES_LIST.find((a) => a.id === id);
};

export const AMENITY_LIST = [
  { key: 'water', label: 'Running Water', icon: 'water' },
  { key: 'electricity', label: 'Electricity', icon: 'flash' },
  { key: 'solar', label: 'Solar Power', icon: 'sunny' },
  { key: 'security', label: 'Security', icon: 'shield-checkmark' },
  { key: 'parking', label: 'Parking', icon: 'car' },
  { key: 'garden', label: 'Garden', icon: 'leaf' },
  { key: 'borehole', label: 'Borehole', icon: 'water-outline' },
  { key: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { key: 'furnished', label: 'Furnished', icon: 'bed' },
  { key: 'kitchen', label: 'Full Kitchen', icon: 'restaurant' },
  { key: 'laundry', label: 'Laundry', icon: 'shirt' },
  { key: 'aircon', label: 'Air Conditioning', icon: 'snow' },
  { key: 'generator', label: 'Generator', icon: 'battery-charging' },
  { key: 'dstv', label: 'DStv', icon: 'tv' },
  { key: 'pets', label: 'Pets Allowed', icon: 'paw' },
  { key: 'transport', label: 'Near Transport', icon: 'bus' },
] as const;

export type AmenityKey = typeof AMENITY_LIST[number]['key'];

export const PROPERTY_TYPES = [
  { key: 'house', label: 'House' },
  { key: 'apartment', label: 'Apartment' },
  { key: 'room', label: 'Room' },
  { key: 'cottage', label: 'Cottage' },
  { key: 'flat', label: 'Flat' },
  { key: 'bedsitter', label: 'Bedsitter' },
] as const;
