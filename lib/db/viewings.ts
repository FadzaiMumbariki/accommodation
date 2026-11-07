import { supabase } from '../supabase';
import type { ViewingRequest, ViewingStatus } from '../../types';
import { type ViewingRow, toSqlTime, rowToViewing, generateUuid } from './types';

const VIEWING_SELECT =
  '*, properties(title, images, city, suburb, price), tenant:profiles!viewing_requests_tenant_id_fkey(full_name, phone)';

export async function insertViewing(
  tenantId: string,
  viewing: Omit<ViewingRequest, 'id' | 'createdAt' | 'landlordId' | 'tenantId' | 'tenantName'>,
): Promise<ViewingRequest> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(viewing.date)) {
    throw new Error('Choose a valid viewing date.');
  }
  const sqlTime = toSqlTime(viewing.time);
  const scheduledAt = new Date(`${viewing.date}T${sqlTime}`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new Error('Choose a viewing date and time in the future.');
  }

  if (!supabase) throw new Error('Viewing requests require a Supabase connection.');

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
    if (conflictError.code === '22P02') {
      return {
        ...viewing,
        id: generateUuid(),
        tenantId,
        tenantName: 'You',
        landlordId: '',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }
    console.error('[insertViewing] Conflict check failed:', conflictError.message);
    throw conflictError;
  }
  if (conflict)
    throw new Error('That viewing time is already requested. Please choose another time.');

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
    if (error.code === '22P02') {
      return {
        ...viewing,
        id: generateUuid(),
        tenantId,
        tenantName: 'You',
        landlordId: '',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }
    console.error('[insertViewing]', error.message);
    if (error.code === '23505') {
      throw new Error('That viewing time is already requested. Please choose another time.');
    }
    throw error;
  }
  return rowToViewing(data as unknown as ViewingRow);
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
  return (data ?? []).map((r) => rowToViewing(r as unknown as ViewingRow));
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
  return (data ?? []).map((r) => rowToViewing(r as unknown as ViewingRow));
}

export async function updateViewingStatus(viewingId: string, status: ViewingStatus): Promise<void> {
  if (!supabase) throw new Error('Viewing requests require a Supabase connection.');
  const { error } = await supabase.from('viewing_requests').update({ status }).eq('id', viewingId);
  if (error) {
    console.error('[updateViewingStatus]', error.message);
    throw error;
  }
}

export async function rescheduleViewing(
  viewingId: string,
  newDate: string,
  newTime: string,
): Promise<void> {
  if (!supabase) throw new Error('Viewing requests require a Supabase connection.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    throw new Error('Choose a valid viewing date.');
  }
  const sqlTime = toSqlTime(newTime);
  const scheduledAt = new Date(`${newDate}T${sqlTime}`);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw new Error('Choose a viewing date and time in the future.');
  }
  const { error } = await supabase
    .from('viewing_requests')
    .update({ viewing_date: newDate, viewing_time: sqlTime, status: 'pending' })
    .eq('id', viewingId);
  if (error) {
    console.error('[rescheduleViewing]', error.message);
    throw error;
  }
}
