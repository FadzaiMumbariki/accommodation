import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';
import { resolveLocationCoordinates, sortByProximity } from '../coordinates';
import type { Property, PropertyFilters } from '../../types';
import { type PropertyRow, rowToProperty, generateUuid } from './types';

export const PROPERTY_PAGE_SIZE = 20;

export interface PropertyPage {
  properties: Property[];
  hasMore: boolean;
}

export async function fetchProperties(filters?: PropertyFilters, page = 0): Promise<PropertyPage> {
  if (!supabase) return { properties: [], hasMore: false };

  let query = supabase
    .from('properties')
    .select('*, profiles(full_name, avatar_url, phone, verified)', { count: 'exact' })
    .eq('available', true)
    .order('created_at', { ascending: false });

  const search = filters?.search?.replace(/[^a-zA-Z0-9\s'-]/g, ' ').trim();
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,city.ilike.%${search}%,suburb.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }
  // City filter: if provided, match exactly; if not provided, show all cities
  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.suburb) query = query.eq('suburb', filters.suburb);
  if (filters?.province) query = query.eq('province', filters.province);
  if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
    query = query.in('property_type', filters.propertyTypes);
  } else if (filters?.propertyType && filters.propertyType !== 'any') {
    query = query.eq('property_type', filters.propertyType);
  }
  const minPrice = filters?.budgetMin ?? filters?.minPrice;
  const maxPrice = filters?.budgetMax ?? filters?.maxPrice;
  if (minPrice != null) query = query.gte('price', minPrice);
  if (maxPrice != null) query = query.lte('price', maxPrice);
  if (typeof filters?.bedrooms === 'number') query = query.gte('bedrooms', filters.bedrooms);
  if (typeof filters?.bathrooms === 'number') query = query.gte('bathrooms', filters.bathrooms);
  if (filters?.availableNowOnly) query = query.eq('availability_status', 'available_now');
  if (filters?.furnishedOnly || filters?.furnished === true || filters?.furnished === 'furnished') {
    query = query.contains('amenities', ['furnished']);
  } else if (filters?.furnished === false || filters?.furnished === 'unfurnished') {
    query = query.not('amenities', 'cs', '{"furnished"}');
  }
  const requestedAmenities = filters?.selectedAmenities?.length
    ? filters.selectedAmenities
    : filters?.amenities;
  if (requestedAmenities?.length) query = query.contains('amenities', requestedAmenities);

  const from = Math.max(0, page) * PROPERTY_PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PROPERTY_PAGE_SIZE - 1);
  if (error) {
    console.warn('[fetchProperties]', error.message);
    return { properties: [], hasMore: false };
  }
  const rows = data ?? [];
  let propertyList = rows.map((r) => rowToProperty(r as unknown as PropertyRow));

  const ref =
    filters?.referenceCoordinates ||
    (filters?.nearby
      ? resolveLocationCoordinates(filters?.search, filters?.city, filters?.suburb)
      : undefined);
  if (ref) {
    propertyList = sortByProximity(propertyList, ref, filters?.searchRadius);
  }

  return {
    properties: propertyList,
    hasMore: count != null ? from + rows.length < count : rows.length === PROPERTY_PAGE_SIZE,
  };
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  if (!supabase || !id) return null;

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, profiles(full_name, avatar_url, phone, verified)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[fetchPropertyById]', error.message);
      return null;
    }
    return data ? rowToProperty(data as unknown as PropertyRow) : null;
  } catch (error) {
    console.error('[database] fetchPropertyById error:', error);
    return null;
  }
}

export async function fetchLandlordProperties(landlordId: string): Promise<Property[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('properties')
    .select('*, profiles(full_name, avatar_url, phone, verified)')
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchLandlordProperties]', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToProperty(r as unknown as PropertyRow));
}

export async function insertProperty(
  landlordId: string,
  property: Omit<Property, 'id' | 'postedAt' | 'landlord'>,
): Promise<Property> {
  if (!supabase) throw new Error('Property listings require a Supabase connection.');
  if (property.images.some((uri) => uri.startsWith('file://') || uri.startsWith('content://'))) {
    throw new Error('Property photos must finish uploading before the listing can be saved.');
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      landlord_id: landlordId,
      title: property.title,
      property_type: property.propertyType,
      price: property.price,
      deposit: property.deposit,
      city: property.city,
      suburb: property.suburb,
      province: property.province,
      address: property.address,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      max_occupants: property.maxOccupants,
      images: property.images,
      amenities: property.amenities,
      description: property.description,
      available: property.available ?? true,
      availability_status: property.availabilityStatus ?? 'available_now',
      available_from_date: property.availableFromDate ?? null,
      lat: property.coordinates?.lat ?? null,
      lng: property.coordinates?.lng ?? null,
    })
    .select('*, profiles(full_name, avatar_url, phone, verified)')
    .single();

  if (error) {
    console.error('[insertProperty]', error.message);
    if (error.message?.toLowerCase().includes('violates row-level security')) {
      throw new Error(
        'Only landlords can publish property listings. Please ensure your account is set to Landlord.',
      );
    }
    throw error;
  }
  if (!data) throw new Error('The property listing could not be saved.');
  return rowToProperty(data as unknown as PropertyRow);
}

export async function uploadPropertyImage(userId: string, uri: string): Promise<string> {
  if (!supabase) throw new Error('Photo uploads require a Supabase connection.');
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  // Always run through manipulateAsync — it writes a new file:// URI that fetch() can read
  // on both iOS and Android (the original picker URI may be a content:// URI on Android
  // which fetch() cannot reliably read as a stream).
  let uploadUri: string;
  try {
    const actions: ImageManipulator.Action[] = [];
    const preview = await ImageManipulator.manipulateAsync(uri, [], { base64: false });
    if (preview.width > 1600) {
      actions.push({ resize: { width: 1600 } });
    }
    const compressed = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    uploadUri = compressed.uri; // always a file:// URI
  } catch (manipulatorError) {
    console.warn(
      '[uploadPropertyImage] Image compression failed, trying original URI:',
      manipulatorError,
    );
    uploadUri = uri;
  }

  // fetch() on a file:// URI is supported by React Native and returns the raw bytes
  const response = await fetch(uploadUri);
  if (!response.ok) {
    throw new Error(`Could not read photo for upload (HTTP ${response.status}).`);
  }
  const body = await response.arrayBuffer();

  const path = `${userId}/${generateUuid()}.jpg`;
  const { error } = await supabase.storage
    .from('property-images')
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    console.error('[uploadPropertyImage]', error.message);
    throw error;
  }
  return supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl;
}

export async function deleteAccountAndPropertyImages(userId: string): Promise<void> {
  if (!supabase) throw new Error('Account deletion requires a Supabase connection.');
  if (!userId) throw new Error('Could not identify the account to delete.');
  const bucket = supabase.storage.from('property-images');

  while (true) {
    const { data, error: listError } = await bucket.list(userId, { limit: 100, offset: 0 });
    if (listError) {
      console.error(
        '[deleteAccountAndPropertyImages] Could not list account photos:',
        listError.message,
      );
      throw listError;
    }
    const paths = (data ?? []).map((file) => `${userId}/${file.name}`);
    if (paths.length === 0) break;
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      console.error(
        '[deleteAccountAndPropertyImages] Could not remove account photos:',
        removeError.message,
      );
      throw removeError;
    }
    if (paths.length < 100) break;
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.error('[deleteAccountAndPropertyImages] Account deletion failed:', error.message);
    throw error;
  }
}

export async function updateProperty(
  propertyId: string,
  property: Partial<Omit<Property, 'id' | 'postedAt' | 'landlord'>>,
): Promise<Property> {
  if (!supabase) throw new Error('Property listings require a Supabase connection.');
  if (property.images?.some((uri) => uri.startsWith('file://') || uri.startsWith('content://'))) {
    throw new Error('Property photos must finish uploading before the listing can be saved.');
  }

  const payload: Record<string, unknown> = {};
  if (property.title !== undefined) payload.title = property.title;
  if (property.propertyType !== undefined) payload.property_type = property.propertyType;
  if (property.price !== undefined) payload.price = property.price;
  if (property.deposit !== undefined) payload.deposit = property.deposit;
  if (property.city !== undefined) payload.city = property.city;
  if (property.suburb !== undefined) payload.suburb = property.suburb;
  if (property.province !== undefined) payload.province = property.province;
  if (property.address !== undefined) payload.address = property.address;
  if (property.bedrooms !== undefined) payload.bedrooms = property.bedrooms;
  if (property.bathrooms !== undefined) payload.bathrooms = property.bathrooms;
  if (property.maxOccupants !== undefined) payload.max_occupants = property.maxOccupants;
  if (property.images !== undefined) payload.images = property.images;
  if (property.amenities !== undefined) payload.amenities = property.amenities;
  if (property.description !== undefined) payload.description = property.description;
  if (property.available !== undefined) payload.available = property.available;
  if (property.availabilityStatus !== undefined)
    payload.availability_status = property.availabilityStatus;
  if (property.availableFromDate !== undefined)
    payload.available_from_date = property.availableFromDate;
  if (property.coordinates !== undefined) {
    payload.lat = property.coordinates?.lat ?? null;
    payload.lng = property.coordinates?.lng ?? null;
  }

  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', propertyId)
    .select('*, profiles(full_name, avatar_url, phone, verified)')
    .single();
  if (error) {
    console.error('[updateProperty]', error.message);
    throw error;
  }
  return rowToProperty(data as unknown as PropertyRow);
}

export async function deleteProperty(propertyId: string): Promise<void> {
  if (!supabase) throw new Error('Property listings require a Supabase connection.');
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) {
    console.error('[deleteProperty]', error.message);
    throw error;
  }
}
