import { supabase } from './supabase';
import { parseQueryLocally, sanitizeAiFilters, type AiSearchResult } from './aiFilters';
import { describeAiError, type AiUnavailableReason } from './aiAvailability';

export interface ListingFacts {
  title: string;
  propertyType: string;
  city: string;
  suburb: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  amenities: string[];
}

export interface ListingDescriptionResult {
  description: string;
  source: 'ai' | 'basic';
  /** Present only when the AI was attempted but failed, so the UI can explain the fallback. */
  unavailable?: AiUnavailableReason;
}

/**
 * Natural-language search.
 * 1. Tries the Supabase `ai-search` Edge Function, which holds the Gemini key server-side.
 * 2. Gracefully falls back to local keyword parsing.
 */
export async function aiSearch(query: string, knownCities: string[]): Promise<AiSearchResult> {
  const trimmed = query.trim().slice(0, 200);

  // 1. Try Supabase Edge Function
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: trimmed, knownCities: knownCities.slice(0, 60) },
      });
      if (!error && data && !data.error) {
        return { ...sanitizeAiFilters(data, knownCities), source: 'ai' };
      }
      // Surface a truthful reason for the fallback instead of hiding it.
      const unavailable = error ? describeAiError(error) : 'outage';
      return { ...parseQueryLocally(trimmed, knownCities), source: 'basic', unavailable };
    } catch {
      // Continue to local parser
    }
  }

  // 2. Robust Local Parser fallback
  return { ...parseQueryLocally(trimmed, knownCities), source: 'basic' };
}

/**
 * Drafts an attractive, professional listing description.
 * 1. Tries the Supabase `ai-describe` Edge Function, which holds the Gemini key server-side.
 * 2. Gracefully generates a Zimbabwean rental description template from the landlord's own details.
 */
export async function generateListingDescription(
  facts: ListingFacts,
): Promise<ListingDescriptionResult> {
  // 1. Try Supabase Edge Function
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-describe', { body: facts });
      if (!error && data && !data.error && typeof data.description === 'string') {
        return { description: data.description, source: 'ai' };
      }
      // Surface a truthful reason for the template fallback instead of hiding it.
      const unavailable = error ? describeAiError(error) : 'outage';
      return { description: buildTemplateDescription(facts), source: 'basic', unavailable };
    } catch {
      // Fall through to template generator
    }
  }

  // 2. Smart Local Template Generator
  return { description: buildTemplateDescription(facts), source: 'basic' };
}

function buildTemplateDescription(facts: ListingFacts): string {
  const amenitySentence = facts.amenities.length
    ? `Listed amenities include ${facts.amenities.join(', ')}.`
    : '';
  return [
    `${facts.title} is a ${facts.bedrooms}-bedroom ${facts.propertyType} in ${facts.suburb}, ${facts.city}.`,
    `The property has ${facts.bathrooms} bathroom(s) and is listed at $${facts.price} per month.`,
    amenitySentence,
  ]
    .filter(Boolean)
    .join(' ');
}
