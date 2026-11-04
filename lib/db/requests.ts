import { supabase } from '../supabase';
import type { AccommodationRequest } from '../../types';
import { type AccommodationRequestRow, rowToRequest } from './types';

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
      furnished:
        typeof request.furnished === 'boolean'
          ? request.furnished
            ? 'furnished'
            : 'unfurnished'
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
  return rowToRequest(data as unknown as AccommodationRequestRow);
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
  return (data ?? []).map((r) => rowToRequest(r as unknown as AccommodationRequestRow));
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
  return (data ?? []).map((r) => rowToRequest(r as unknown as AccommodationRequestRow));
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
