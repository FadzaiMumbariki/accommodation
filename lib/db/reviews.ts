import { supabase } from '../supabase';
import type { ReviewRow } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Reviews & Reporting
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

  const { error } = await supabase.from('reviews').insert({
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
