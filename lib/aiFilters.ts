import type { PropertyFilters, PropertyType } from '../types';

export const PROPERTY_TYPES: PropertyType[] = ['house', 'apartment', 'room', 'cottage', 'flat', 'bedsitter'];

export interface AiSearchResult {
  filters: PropertyFilters;
  summary: string;
  /** 'ai' = Gemini via Edge Function, 'basic' = local keyword parser used as a fallback. */
  source: 'ai' | 'basic';
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const asNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/**
 * Never trust model output. Keeps only known fields, enforces types and sane ranges, and drops any
 * city that is not a real city in the app's data (so the AI cannot send the user to a made-up place).
 */
export function sanitizeAiFilters(raw: unknown, knownCities: string[]): Omit<AiSearchResult, 'source'> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const filters: PropertyFilters = {};

  if (typeof input.city === 'string') {
    const match = knownCities.find(c => c.toLowerCase() === input.city!.toString().trim().toLowerCase());
    if (match) filters.city = match;
  }
  if (typeof input.suburb === 'string' && input.suburb.trim() && input.suburb.length <= 40) {
    filters.suburb = input.suburb.trim();
  }
  if (typeof input.propertyType === 'string' && PROPERTY_TYPES.includes(input.propertyType as PropertyType)) {
    filters.propertyType = input.propertyType as PropertyType;
  }
  const bedrooms = asNumber(input.bedrooms);
  if (bedrooms !== undefined) filters.bedrooms = clamp(Math.round(bedrooms), 0, 10);
  const bathrooms = asNumber(input.bathrooms);
  if (bathrooms !== undefined) filters.bathrooms = clamp(Math.round(bathrooms), 0, 10);

  let min = asNumber(input.budgetMin);
  let max = asNumber(input.budgetMax);
  if (min !== undefined) min = clamp(min, 0, 100000);
  if (max !== undefined) max = clamp(max, 0, 100000);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  if (min !== undefined && min > 0) filters.budgetMin = min;
  if (max !== undefined && max > 0) filters.budgetMax = max;

  if (input.furnished === true) filters.furnished = true;
  if (input.availableNowOnly === true) filters.availableNowOnly = true;
  if (Array.isArray(input.amenities)) {
    const amenities = input.amenities
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0 && a.length <= 30)
      .slice(0, 8);
    if (amenities.length) filters.amenities = amenities;
  }

  const summary = typeof input.summary === 'string' ? input.summary.trim().slice(0, 160) : '';
  return { filters, summary: summary || describeFilters(filters) };
}

export function describeFilters(f: PropertyFilters): string {
  const parts: string[] = [];
  if (typeof f.bedrooms === 'number') parts.push(`${f.bedrooms}+ bedrooms`);
  if (f.propertyType && f.propertyType !== 'any' && f.propertyType !== 'all') parts.push(f.propertyType);
  if (f.suburb || f.city) parts.push(`in ${[f.suburb, f.city].filter(Boolean).join(', ')}`);
  if (f.budgetMin != null && f.budgetMax != null) parts.push(`$${f.budgetMin}-$${f.budgetMax}/mo`);
  else if (f.budgetMax != null) parts.push(`up to $${f.budgetMax}/mo`);
  else if (f.budgetMin != null) parts.push(`from $${f.budgetMin}/mo`);
  if (f.furnished === true) parts.push('furnished');
  if (f.availableNowOnly) parts.push('available now');
  return parts.length ? parts.join(', ') : 'No filters recognised';
}

/** Simple keyword fallback used when the AI service is unavailable or the app is in mock mode. */
export function parseQueryLocally(query: string, knownCities: string[]): Omit<AiSearchResult, 'source'> {
  const text = query.toLowerCase();
  const raw: Record<string, unknown> = {};

  const city = knownCities.find(c => text.includes(c.toLowerCase()));
  if (city) raw.city = city;

  const type = PROPERTY_TYPES.find(t => new RegExp(`\\b${t}s?\\b`).test(text));
  if (type) raw.propertyType = type;

  const beds = text.match(/(\d+)\s*(?:-|\s)?\s*(?:bed|bedroom|br)\b/);
  if (beds) raw.bedrooms = Number(beds[1]);

  const max = text.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*\$?\s*(\d+)/);
  if (max) raw.budgetMax = Number(max[1]);
  const min = text.match(/(?:over|above|more than|from|min(?:imum)?)\s*\$\s*(\d+)/);
  if (min) raw.budgetMin = Number(min[1]);

  if (/\bfurnished\b/.test(text) && !/\bunfurnished\b/.test(text)) raw.furnished = true;
  if (/available now|immediately/.test(text)) raw.availableNowOnly = true;

  // Local Zimbabwean keywords for amenities
  const amenities: string[] = [];
  if (/borehole|tank|water\s*tank/.test(text)) amenities.push('borehole');
  if (/solar|inverter|generator|backup\s*power/.test(text)) amenities.push('solar');
  if (/durawall|walled|gate|security|electric\s*fence/.test(text)) amenities.push('durawall');
  if (/wifi|fibre|fiber|internet/.test(text)) amenities.push('wifi');
  if (/parking|garage/.test(text)) amenities.push('parking');
  if (/kitchen|fitted\s*kitchen/.test(text)) amenities.push('kitchen');
  if (/ensuite|en-suite/.test(text)) amenities.push('ensuite');

  if (amenities.length > 0) raw.amenities = amenities;

  return sanitizeAiFilters(raw, knownCities);
}
