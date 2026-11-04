import type {
  Property,
  PropertyType,
  Landlord,
  ViewingRequest,
  ViewingStatus,
  AccommodationRequest,
  RequestStatus,
  Conversation,
  ChatMessage,
  ChatMessageType,
  AvailabilityStatus,
} from '../../types';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export type DatabaseNumber = number | string;

export interface ProfileSummaryRow {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  verified?: boolean;
}

export interface PropertyRow {
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

export interface ViewingRow {
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

export interface AccommodationRequestRow {
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

export interface MessageRow extends Record<string, unknown> {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
  type?: ChatMessageType | null;
}

export interface ConversationRow {
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

export interface SavedPropertyRow {
  property_id: string;
}

export interface ReviewRow {
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
    coordinates:
      row.lat != null && row.lng != null
        ? { lat: Number(row.lat), lng: Number(row.lng) }
        : undefined,
    postedAt: row.created_at,
  };
}

export function toSqlTime(value: string): string {
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

export function rowToViewing(row: ViewingRow): ViewingRequest {
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

export function rowToRequest(row: AccommodationRequestRow): AccommodationRequest {
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
    propertyType: type === 'any' ? 'any' : (type as PropertyType),
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

export function rowToMessage(row: MessageRow): ChatMessage {
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

export function isMessageRow(row: Record<string, unknown>): row is MessageRow {
  const validTypes: ChatMessageType[] = [
    'text',
    'viewing_request',
    'viewing_confirmation',
    'property_inquiry',
    'system',
  ];
  return (
    typeof row.id === 'string' &&
    typeof row.conversation_id === 'string' &&
    typeof row.sender_id === 'string' &&
    typeof row.text === 'string' &&
    typeof row.created_at === 'string' &&
    typeof row.read === 'boolean' &&
    (row.type == null || validTypes.some((type) => type === row.type))
  );
}

export function rowToConversation(row: ConversationRow, userId: string): Conversation {
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
