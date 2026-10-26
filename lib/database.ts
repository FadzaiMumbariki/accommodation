/**
 * ImbaFind — Supabase Data Access Layer
 *
 * All database calls go through this module so the rest of the app
 * never imports supabase directly (easier to test/mock).
 */
import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import type {
  Property,
  PropertyFilters,
  PropertyType,
  Landlord,
  ViewingRequest,
  ViewingStatus,
  AccommodationRequest,
  RequestStatus,
  Conversation,
  ChatMessage,
  ChatMessageType,
  UserRole,
  AvailabilityStatus,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type DatabaseNumber = number | string;

interface ProfileSummaryRow {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  verified?: boolean;
}

interface PropertyRow {
  id: string;
  landlord_id: string;
  title: string;
  property_type: PropertyType;
  price: DatabaseNumber;
  deposit: DatabaseNumber | null;
  city: string;
  suburb: string;
  province: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  images: string[] | null;
  amenities: string[] | null;
  description: string | null;
  available: boolean;
  availability_status: AvailabilityStatus | null;
  available_from_date: string | null;
  verified: boolean;
  rating: DatabaseNumber | null;
  reviews_count: number | null;
  lat: DatabaseNumber | null;
  lng: DatabaseNumber | null;
  created_at: string;
  profiles: ProfileSummaryRow | null;
}

interface ViewingRow {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  viewing_date: string;
  viewing_time: string;
  attendees: number;
  message: string | null;
  status: ViewingStatus;
  created_at: string;
  properties: {
    title: string | null;
    images: string[] | null;
    city: string | null;
    suburb: string | null;
    price: DatabaseNumber | null;
  } | null;
  tenant: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface AccommodationRequestRow {
  id: string;
  user_id: string;
  property_type: string | null;
  bedrooms: string | null;
  number_of_people: number;
  city: string;
  suburb: string | null;
  province: string;
  min_budget: DatabaseNumber;
  max_budget: DatabaseNumber;
  move_in_date: string;
  furnished: string | null;
  amenities: string[] | null;
  additional_notes: string | null;
  status: RequestStatus;
  created_at: string;
  user: ProfileSummaryRow | null;
}

interface MessageRow extends Record<string, unknown> {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
  type?: ChatMessageType | null;
}

interface ConversationRow {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  tenant_unread: number;
  landlord_unread: number;
  created_at: string;
  tenant: ProfileSummaryRow | null;
  landlord: ProfileSummaryRow | null;
  properties: { title: string | null } | null;
}

interface SavedPropertyRow {
  property_id: string;
}

interface ReviewRow {
  id: string;
  property_id: string;
  author_id: string;
  author_name: string | null;
  rating: number;
  text: string | null;
  created_at: string;
}

/** Map a raw Supabase row to the in-app Property shape */
export function rowToProperty(row: PropertyRow): Property {
  const landlord: Landlord = {
    id: row.landlord_id,
    name: row.profiles?.full_name ?? 'Unknown',
    avatar: row.profiles?.avatar_url ?? undefined,
    phone: row.profiles?.phone ?? '',
    verified: row.profiles?.verified ?? false,
  };

  return {
    id: row.id,
    title: row.title,
    propertyType: row.property_type,
    price: Number(row.price),
    deposit: row.deposit ? Number(row.deposit) : undefined,
    city: row.city,
    suburb: row.suburb,
    province: row.province,
    address: row.address ?? undefined,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    maxOccupants: row.max_occupants,
    images: row.images ?? [],
    amenities: row.amenities ?? [],
    description: row.description ?? '',
    landlord,
    landlordId: row.landlord_id,
    available: row.available,
    availabilityStatus: row.availability_status ?? undefined,
    availableFromDate: row.available_from_date ?? undefined,
    verified: row.verified,
    rating: row.rating ? Number(row.rating) : undefined,
    reviewsCount: row.reviews_count ?? 0,
    coordinates: row.lat != null && row.lng != null
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : undefined,
    postedAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Properties
// ─────────────────────────────────────────────────────────────────────────────

export const PROPERTY_PAGE_SIZE = 20;

export interface PropertyPage {
  properties: Property[];
  hasMore: boolean;
}

export async function fetchProperties(
  filters?: PropertyFilters,
  page = 0,
): Promise<PropertyPage> {
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
  if (filters?.city) query = query.ilike('city', filters.city);
  if (filters?.suburb) query = query.ilike('suburb', filters.suburb);
  if (filters?.province) query = query.ilike('province', filters.province);
  if (filters?.propertyType && filters.propertyType !== 'any') {
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
    query = query.contains('amenities', ['Furnished']);
  } else if (filters?.furnished === false || filters?.furnished === 'unfurnished') {
    query = query.not('amenities', 'cs', '{"Furnished"}');
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
  return {
    properties: rows.map(rowToProperty),
    hasMore: count != null ? from + rows.length < count : rows.length === PROPERTY_PAGE_SIZE,
  };
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('properties')
    .select('*, profiles(full_name, avatar_url, phone, verified)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[fetchPropertyById]', error.message);
    return null;
  }
  return data ? rowToProperty(data) : null;
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
  return (data ?? []).map(rowToProperty);
}

export async function insertProperty(
  landlordId: string,
  property: Omit<Property, 'id' | 'postedAt' | 'landlord'>,
): Promise<Property> {
  if (!supabase) throw new Error('Property listings require a Supabase connection.');
  if (property.images.some(uri => uri.startsWith('file://') || uri.startsWith('content://'))) {
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
    throw error;
  }
  if (!data) throw new Error('The property listing could not be saved.');
  return rowToProperty(data);
}

export async function uploadPropertyImage(userId: string, uri: string): Promise<string> {
  if (!supabase) throw new Error('Photo uploads require a Supabase connection.');
  const manipulator = ImageManipulator.ImageManipulator.manipulate(uri);
  const original = await manipulator.renderAsync();
  let image = original;
  if (original.width > 1600) {
    manipulator.reset().resize({ width: 1600 });
    image = await manipulator.renderAsync();
  }
  const compressed = await image.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.7,
  });
  const response = await fetch(compressed.uri);
  if (!response.ok) throw new Error('Could not prepare the selected photo for upload.');
  const body = await response.arrayBuffer();
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
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
      console.error('[deleteAccountAndPropertyImages] Could not list account photos:', listError.message);
      throw listError;
    }
    const paths = (data ?? []).map(file => `${userId}/${file.name}`);
    if (paths.length === 0) break;
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      console.error('[deleteAccountAndPropertyImages] Could not remove account photos:', removeError.message);
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
  if (property.images?.some(uri => uri.startsWith('file://') || uri.startsWith('content://'))) {
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
  if (property.availabilityStatus !== undefined) payload.availability_status = property.availabilityStatus;
  if (property.availableFromDate !== undefined) payload.available_from_date = property.availableFromDate;
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
  return rowToProperty(data);
}

export async function deleteProperty(propertyId: string): Promise<void> {
  if (!supabase) throw new Error('Property listings require a Supabase connection.');
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (error) {
    console.error('[deleteProperty]', error.message);
    throw error;
  }
}

function toSqlTime(value: string): string {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) throw new Error('Choose a valid viewing time.');
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (match[4]) {
      if (hours < 1 || hours > 12) throw new Error('Choose a valid viewing time.');
      if (match[4].toUpperCase() === 'AM' && hours === 12) hours = 0;
      if (match[4].toUpperCase() === 'PM' && hours !== 12) hours += 12;
    }
    if (hours > 23 || minutes > 59) throw new Error('Choose a valid viewing time.');
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }

function rowToViewing(row: ViewingRow): ViewingRequest {
    const property = row.properties;
    const tenant = row.tenant;
    const date = String(row.viewing_date);
    const [hours = '0', minutes = '0'] = String(row.viewing_time).split(':');
    const time = new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return {
      id: row.id,
      propertyId: row.property_id,
      propertyTitle: property?.title ?? 'Property',
      propertyImage: property?.images?.[0] ?? '',
      propertyLocation: [property?.suburb, property?.city].filter(Boolean).join(', '),
      propertyPrice: property?.price == null ? undefined : Number(property.price),
      tenantId: row.tenant_id,
      tenantName: tenant?.full_name ?? 'Tenant',
      tenantPhone: tenant?.phone ?? undefined,
      landlordId: row.landlord_id,
      date,
      time,
      numberOfPeople: row.attendees,
      attendees: row.attendees,
      message: row.message ?? undefined,
      status: row.status as ViewingStatus,
      createdAt: row.created_at,
    };
  }

const VIEWING_SELECT =
  '*, properties(title, images, city, suburb, price), tenant:profiles!viewing_requests_tenant_id_fkey(full_name, phone)';

export async function insertViewing(
    tenantId: string,
    viewing: Omit<ViewingRequest, 'id' | 'createdAt' | 'landlordId' | 'tenantId' | 'tenantName'>,
  ): Promise<ViewingRequest> {
    if (!supabase) throw new Error('Viewing requests require a Supabase connection.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(viewing.date)) {
      throw new Error('Choose a valid viewing date.');
    }
    const sqlTime = toSqlTime(viewing.time);
    const scheduledAt = new Date(`${viewing.date}T${sqlTime}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new Error('Choose a viewing date and time in the future.');
    }

    const { data: conflict, error: conflictError } = await supabase
      .from('viewing_requests')
      .select('id')
      .eq('property_id', viewing.propertyId)
      .eq('viewing_date', viewing.date)
      .eq('viewing_time', sqlTime)
      .in('status', ['pending', 'confirmed'])
      .limit(1)
      .maybeSingle();
    if (conflictError) {
      console.error('[insertViewing] Conflict check failed:', conflictError.message);
      throw conflictError;
    }
    if (conflict) throw new Error('That viewing time is already requested. Please choose another time.');

    const { data, error } = await supabase
      .from('viewing_requests')
      .insert({
        property_id: viewing.propertyId,
        tenant_id: tenantId,
        viewing_date: viewing.date,
        viewing_time: sqlTime,
        attendees: viewing.attendees ?? viewing.numberOfPeople,
        message: viewing.message ?? viewing.notes ?? null,
      })
      .select(VIEWING_SELECT)
      .single();
    if (error) {
      console.error('[insertViewing]', error.message);
      if (error.code === '23505') {
        throw new Error('That viewing time is already requested. Please choose another time.');
      }
      throw error;
    }
    return rowToViewing(data);
  }

export async function fetchMyViewings(tenantId: string): Promise<ViewingRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('viewing_requests')
      .select(VIEWING_SELECT)
      .eq('tenant_id', tenantId)
      .order('viewing_date', { ascending: true })
      .order('viewing_time', { ascending: true });
    if (error) {
      console.error('[fetchMyViewings]', error.message);
      throw error;
    }
    return (data ?? []).map(rowToViewing);
  }

export async function fetchLandlordViewings(landlordId: string): Promise<ViewingRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('viewing_requests')
      .select(VIEWING_SELECT)
      .eq('landlord_id', landlordId)
      .order('viewing_date', { ascending: true })
      .order('viewing_time', { ascending: true });
    if (error) {
      console.error('[fetchLandlordViewings]', error.message);
      throw error;
    }
    return (data ?? []).map(rowToViewing);
  }

export async function updateViewingStatus(
    viewingId: string,
    status: ViewingStatus,
  ): Promise<void> {
    if (!supabase) throw new Error('Viewing requests require a Supabase connection.');
    const { error } = await supabase
      .from('viewing_requests')
      .update({ status })
      .eq('id', viewingId);
    if (error) {
      console.error('[updateViewingStatus]', error.message);
      throw error;
    }
}

function rowToRequest(row: AccommodationRequestRow): AccommodationRequest {
  const user = row.user;
  const type = String(row.property_type ?? 'any').toLowerCase();
  const furnished = String(row.furnished ?? 'any').toLowerCase();
  const bedrooms = String(row.bedrooms ?? 'any').toLowerCase();
  return {
    id: row.id,
    userId: row.user_id,
    userName: user?.full_name ?? 'Tenant',
    userPhone: user?.phone ?? undefined,
    userAvatar: user?.avatar_url ?? undefined,
    city: row.city,
    suburb: row.suburb ?? undefined,
    province: row.province,
    propertyType: type === 'any' ? 'any' : type as PropertyType,
    bedrooms: bedrooms === 'any' ? 'any' : Number(bedrooms),
    numberOfPeople: row.number_of_people,
    minBudget: Number(row.min_budget),
    maxBudget: Number(row.max_budget),
    moveInDate: row.move_in_date,
    furnished: ['furnished', 'true'].includes(furnished)
      ? 'furnished'
      : ['semi-furnished', 'semi_furnished'].includes(furnished)
        ? 'semi-furnished'
        : furnished === 'any'
          ? 'any'
          : 'unfurnished',
    amenities: row.amenities ?? [],
    additionalNotes: row.additional_notes ?? undefined,
    status: row.status as RequestStatus,
    postedAt: row.created_at,
    createdAt: row.created_at,
  };
}

const REQUEST_SELECT =
  '*, user:profiles!accommodation_requests_user_id_fkey(full_name, phone, avatar_url)';

export async function insertRequest(
  userId: string,
  request: Omit<AccommodationRequest, 'id' | 'createdAt' | 'postedAt' | 'userId' | 'userName'>,
): Promise<AccommodationRequest> {
  if (!supabase) throw new Error('Accommodation requests require a Supabase connection.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.moveInDate)) {
    throw new Error('Enter your move-in date in YYYY-MM-DD format.');
  }
  const { data, error } = await supabase
    .from('accommodation_requests')
    .insert({
      user_id: userId,
      city: request.city,
      suburb: request.suburb ?? null,
      province: request.province,
      property_type: request.propertyType,
      bedrooms: request.bedrooms === 'any' ? 'any' : String(request.bedrooms),
      number_of_people: request.numberOfPeople,
      min_budget: request.minBudget,
      max_budget: request.maxBudget,
      move_in_date: request.moveInDate,
      furnished: typeof request.furnished === 'boolean'
        ? (request.furnished ? 'furnished' : 'unfurnished')
        : request.furnished,
      amenities: request.amenities,
      additional_notes: request.additionalNotes ?? request.additionalRequirements ?? null,
      status: request.status,
    })
    .select(REQUEST_SELECT)
    .single();
  if (error) {
    console.error('[insertRequest]', error.message);
    throw error;
  }
  return rowToRequest(data);
}

export async function fetchMyRequests(userId: string): Promise<AccommodationRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('accommodation_requests')
    .select(REQUEST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchMyRequests]', error.message);
    throw error;
  }
  return (data ?? []).map(rowToRequest);
}

export async function fetchActiveRequests(): Promise<AccommodationRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('accommodation_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchActiveRequests]', error.message);
    throw error;
  }
  return (data ?? []).map(rowToRequest);
}

export async function updateRequestStatus(
  requestId: string,
  status: 'active' | 'paused' | 'closed',
): Promise<void> {
  if (!supabase) throw new Error('Accommodation requests require a Supabase connection.');
  const { error } = await supabase
    .from('accommodation_requests')
    .update({ status })
    .eq('id', requestId);
  if (error) {
    console.error('[updateRequestStatus]', error.message);
    throw error;
  }
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text,
    timestamp: row.created_at,
    read: row.read,
    type: row.type ?? 'text',
    deliveryStatus: 'sent',
  };
}

function isMessageRow(row: Record<string, unknown>): row is MessageRow {
  const validTypes: ChatMessageType[] = [
    'text',
    'viewing_request',
    'viewing_confirmation',
    'property_inquiry',
    'system',
  ];
  return typeof row.id === 'string'
    && typeof row.conversation_id === 'string'
    && typeof row.sender_id === 'string'
    && typeof row.text === 'string'
    && typeof row.created_at === 'string'
    && typeof row.read === 'boolean'
    && (row.type == null || validTypes.some(type => type === row.type));
}

function rowToConversation(row: ConversationRow, userId: string): Conversation {
  const isTenant = row.tenant_id === userId;
  const participant = isTenant ? row.landlord : row.tenant;
  return {
    id: row.id,
    participantId: isTenant ? row.landlord_id : row.tenant_id,
    participantName: participant?.full_name ?? 'ImbaFind member',
    participantAvatar: participant?.avatar_url ?? undefined,
    participantPhone: participant?.phone ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    messages: [],
    lastMessage: row.last_message ?? '',
    lastMessageTime: row.last_message_at ?? row.created_at,
    unreadCount: isTenant ? row.tenant_unread : row.landlord_unread,
  };
}

const CONVERSATION_SELECT =
  '*, tenant:profiles!conversations_tenant_id_fkey(full_name, avatar_url, phone), landlord:profiles!conversations_landlord_id_fkey(full_name, avatar_url, phone), properties(title)';

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchConversations]', error.message);
    throw error;
  }
  return (data ?? []).map(row => rowToConversation(row, userId));
}

export async function fetchConversationById(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle();
  if (error) {
    console.error('[fetchConversationById]', error.message);
    throw error;
  }
  return data ? rowToConversation(data, userId) : null;
}

export async function upsertConversation(
  userId: string,
  userRole: UserRole,
  participantId: string,
  propertyId?: string,
): Promise<Conversation> {
  if (!supabase) throw new Error('Chat requires a Supabase connection.');
  const tenantId = userRole === 'tenant' ? userId : participantId;
  const landlordId = userRole === 'landlord' ? userId : participantId;
  const { error: upsertError } = await supabase
    .from('conversations')
    .upsert({
      tenant_id: tenantId,
      landlord_id: landlordId,
      property_id: propertyId ?? null,
    }, {
      onConflict: 'tenant_id,landlord_id,property_id',
      ignoreDuplicates: true,
    });
  if (upsertError) {
    console.error('[upsertConversation]', upsertError.message);
    throw upsertError;
  }
  let query = supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('tenant_id', tenantId)
    .eq('landlord_id', landlordId);
  query = propertyId ? query.eq('property_id', propertyId) : query.is('property_id', null);
  const { data, error } = await query.single();
  if (error) {
    console.error('[upsertConversation] Could not load conversation:', error.message);
    throw error;
  }
  return rowToConversation(data, userId);
}

export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
}

const MESSAGE_PAGE_SIZE = 30;

export async function fetchMessages(
  conversationId: string,
  before?: string,
): Promise<MessagePage> {
  if (!supabase) return { messages: [], hasMore: false };
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) {
    console.error('[fetchMessages]', error.message);
    throw error;
  }
  const rows = data ?? [];
  return {
    messages: rows.map(rowToMessage).reverse(),
    hasMore: rows.length === MESSAGE_PAGE_SIZE,
  };
}

export async function sendChatMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  if (!supabase) throw new Error('Chat requires a Supabase connection.');
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_conversation_id: conversationId,
    p_text: text,
  });
  if (error) {
    console.error('[sendChatMessage]', error.message);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Your message could not be sent. Please retry.');
  return rowToMessage(row);
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
  userRole: UserRole,
): Promise<void> {
  if (!supabase) return;
  const { error: messageError } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);
  if (messageError) {
    console.error('[markConversationRead] Could not mark messages:', messageError.message);
    throw messageError;
  }
  const unreadColumn = userRole === 'tenant' ? 'tenant_unread' : 'landlord_unread';
  const { error } = await supabase
    .from('conversations')
    .update({ [unreadColumn]: 0 })
    .eq('id', conversationId);
  if (error) {
    console.error('[markConversationRead] Could not reset unread count:', error.message);
    throw error;
  }
}

export function subscribeToMessages(
  conversationIds: string[],
  onMessage: (message: ChatMessage) => void,
): () => void {
  if (!supabase || conversationIds.length === 0) return () => {};
  const channel = supabase
    .channel(`messages-${Crypto.randomUUID()}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=in.(${conversationIds.join(',')})`,
    }, payload => {
      if (!isMessageRow(payload.new)) {
        console.error('[subscribeToMessages] Received a malformed message row.');
        return;
      }
      onMessage(rowToMessage(payload.new));
    })
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Saved Properties
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSavedPropertyIds(userId: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('saved_properties')
    .select('property_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[fetchSavedPropertyIds]', error.message);
    return [];
  }
  return (data ?? []).map((row: SavedPropertyRow) => row.property_id);
}

export async function saveProperty(userId: string, propertyId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('saved_properties')
    .insert({ user_id: userId, property_id: propertyId });

  if (error) console.error('[saveProperty]', error.message);
  return !error;
}

export async function unsaveProperty(userId: string, propertyId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  if (error) console.error('[unsaveProperty]', error.message);
  return !error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  propertyId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export async function fetchReviews(propertyId: string): Promise<Review[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchReviews]', error.message);
    throw error;
  }
  return (data ?? []).map((row: ReviewRow) => ({
    id: row.id,
    propertyId: row.property_id,
    authorId: row.author_id,
    authorName: row.author_name ?? 'Anonymous',
    rating: row.rating,
    text: row.text ?? '',
    createdAt: row.created_at,
  }));
}

export async function insertReview(
  propertyId: string,
  authorId: string,
  authorName: string,
  rating: number,
  text: string,
): Promise<void> {
  if (!supabase) throw new Error('Reviews require a Supabase connection.');

  const { error } = await supabase
    .from('reviews')
    .insert({
      property_id: propertyId,
      author_id: authorId,
      author_name: authorName,
      rating,
      text,
    });

  if (error) {
    console.error('[insertReview]', error.message);
    throw error;
  }
}

export async function updateReview(
  propertyId: string,
  authorId: string,
  rating: number,
  text: string,
): Promise<void> {
  if (!supabase) throw new Error('Reviews require a Supabase connection.');
  const { data, error } = await supabase
    .from('reviews')
    .update({ rating, text })
    .eq('property_id', propertyId)
    .eq('author_id', authorId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[updateReview]', error.message);
    throw error;
  }
  if (!data) throw new Error('Your review could not be found. Refresh and try again.');
}

export interface CreateReportInput {
  reporterId: string;
  propertyId?: string;
  reportedUserId?: string;
  reason: string;
  details?: string;
}

export async function insertReport(input: CreateReportInput): Promise<void> {
  if (!supabase) throw new Error('Reporting requires a Supabase connection.');
  if (!input.reason.trim() || (!input.propertyId && !input.reportedUserId)) {
    throw new Error('Choose a reason and a listing or user to report.');
  }
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    property_id: input.propertyId ?? null,
    reported_user_id: input.reportedUserId ?? null,
    reason: input.reason.trim(),
    details: input.details?.trim() || null,
  });
  if (error) {
    console.error('[insertReport]', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'tenant' | 'landlord';
  verified: boolean;
  createdAt: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, role, verified, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[fetchProfile]', error.message);
    return null;
  }
  return data
    ? {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role === 'landlord' ? 'landlord' : 'tenant',
        verified: data.verified,
        createdAt: data.created_at,
      }
    : null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'fullName' | 'phone' | 'avatarUrl' | 'role'>>,
): Promise<boolean> {
  if (!supabase) return false;

  const payload: {
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    role?: 'tenant' | 'landlord';
  } = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.role !== undefined) payload.role = updates.role;

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) console.error('[updateProfile]', error.message);
  return !error;
}

export async function savePushToken(userId: string, pushToken: string): Promise<void> {
  if (!supabase) throw new Error('Push token storage requires a Supabase connection.');
  const { data, error } = await supabase
    .from('profiles')
    .update({ push_token: pushToken })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[savePushToken]', error.message);
    throw error;
  }
  if (!data) throw new Error('Could not save the notification token for this account.');
}

export async function clearPushToken(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
  if (error) {
    console.error('[clearPushToken]', error.message);
    throw error;
  }
}
