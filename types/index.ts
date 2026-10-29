// ─────────────────────────────────────────────────────────────────────────────
// ImbaFind – TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'tenant' | 'landlord';

export type AvailabilityStatus = 'available_now' | 'available_from' | 'occupied';

export type ViewingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'paused' | 'rejected';

export type RequestStatus = 'active' | 'paused' | 'matched' | 'closed' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  verified: boolean;
  memberSince: string;
}

export type PropertyType = 'house' | 'apartment' | 'room' | 'cottage' | 'flat' | 'bedsitter';

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category?: 'utility' | 'security' | 'comfort' | 'outdoor';
}

export interface Property {
  id: string;
  title: string;
  propertyType: PropertyType;
  price: number;
  deposit?: number;
  city: string;
  suburb: string;
  province: string;
  address?: string;
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  images: string[];
  amenities: string[];
  description: string;
  landlord: Landlord;
  landlordId?: string;
  available: boolean;
  availabilityStatus?: AvailabilityStatus;
  availableFromDate?: string;
  verified: boolean;
  postedAt: string;
  rating?: number;
  reviewsCount?: number;
  coordinates?: { lat: number; lng: number };
  distanceKm?: number;
}

export interface Landlord {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  verified: boolean;
  responseTime?: string;
  rating?: number;
  totalListings?: number;
}

export interface SavedProperty {
  propertyId: string;
  savedAt: string;
}

export interface AccommodationRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  userAvatar?: string;
  city: string;
  suburb?: string;
  province: string;
  propertyType: PropertyType | 'any';
  bedrooms: number | 'any';
  numberOfPeople: number;
  minBudget: number;
  maxBudget: number;
  moveInDate: string;
  furnished: boolean | 'any' | 'furnished' | 'semi-furnished' | 'unfurnished';
  amenities: string[];
  requiredAmenities?: string[];
  additionalNotes?: string;
  additionalRequirements?: string;
  status: RequestStatus;
  postedAt: string;
  createdAt?: string;
}

export interface ViewingRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation?: string;
  propertyPrice?: number;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string;
  landlordId: string;
  date: string;
  time: string;
  numberOfPeople: number;
  attendees?: number;
  message?: string;
  notes?: string;
  status: ViewingStatus;
  createdAt: string;
}

export type ChatMessageType = 'text' | 'viewing_request' | 'viewing_confirmation' | 'property_inquiry' | 'system';

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  deliveryStatus?: 'sending' | 'failed' | 'sent';
  type?: ChatMessageType;
  viewingDetails?: {
    date: string;
    time: string;
    attendees: number;
    notes?: string;
  };
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantPhone?: string;
  propertyId?: string;
  propertyTitle?: string;
  messages: ChatMessage[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified filter type — replaces the old split SearchFilters + FilterState
// ─────────────────────────────────────────────────────────────────────────────
export interface PropertyFilters {
  search?: string;
  location?: string;
  province?: string;
  city?: string;
  suburb?: string;
  propertyType?: PropertyType | 'any' | 'all';
  propertyTypes?: PropertyType[];
  nearby?: boolean;
  referenceCoordinates?: { latitude: number; longitude: number };
  bedrooms?: number | 'any';
  bathrooms?: number | 'any';
  /** Canonical budget lower bound. Use this — not minPrice. */
  budgetMin?: number;
  /** Canonical budget upper bound. Use this — not maxPrice. */
  budgetMax?: number;
  /** @deprecated Use budgetMin instead */
  minPrice?: number;
  /** @deprecated Use budgetMax instead */
  maxPrice?: number;
  /** Canonical furnishing filter. Use this — not furnishedOnly. */
  furnished?: boolean | 'any' | 'furnished' | 'unfurnished';
  /** @deprecated Use furnished instead */
  furnishedOnly?: boolean;
  /** Canonical amenities list. Use this — not selectedAmenities. */
  amenities?: string[];
  /** @deprecated Use amenities instead */
  selectedAmenities?: string[];
  availableNowOnly?: boolean;
  searchRadius?: number;
}

/** @deprecated Use PropertyFilters instead */
export type SearchFilters = PropertyFilters;

/** @deprecated Use PropertyFilters instead */
export type FilterState = PropertyFilters;

export interface LocationItem {
  province: string;
  cities: {
    name: string;
    suburbs: string[];
  }[];
}
