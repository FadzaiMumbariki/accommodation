import { supabase } from '../supabase';
import type { SavedPropertyRow } from './types';

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
