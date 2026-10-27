// ImbaFind – AI search endpoint.
//
// This file only runs on the server, so GEMINI_API_KEY (deliberately *not*
// prefixed with EXPO_PUBLIC_) is stripped from the client bundle.
// Scope: turns a free-text phrase into the structured filters Explore already uses.
import { AMENITY_LIST, PROPERTY_TYPES } from '../../constants/amenities';
import type { PropertyFilters, PropertyType } from '../../types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_QUERY_LENGTH = 300;

const ALLOWED_TYPES: string[] = PROPERTY_TYPES.map(type => type.key);
const ALLOWED_AMENITIES: string[] = AMENITY_LIST.map(amenity => amenity.key);
const AMENITY_HINTS = AMENITY_LIST.map(amenity => `${amenity.key} (${amenity.label})`).join(', ');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    city: { type: 'STRING', description: 'City from the allowed list, or "" if not stated.' },
    suburb: { type: 'STRING', description: 'Suburb from the allowed list, or "" if not stated.' },
    propertyType: {
      type: 'STRING',
      enum: [...ALLOWED_TYPES, 'any'],
      description: 'Property type, or "any" if not stated.',
    },
    bedrooms: { type: 'INTEGER', description: 'Minimum bedrooms, 0 if not stated.' },
    bathrooms: { type: 'INTEGER', description: 'Minimum bathrooms, 0 if not stated.' },
    budgetMin: { type: 'INTEGER', description: 'Minimum monthly rent in USD, 0 if not stated.' },
    budgetMax: { type: 'INTEGER', description: 'Maximum monthly rent in USD, 0 if not stated.' },
    amenities: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Matching amenity keys from the allowed list. Empty if none mentioned.',
    },
    summary: {
      type: 'STRING',
      description: 'Short confirmation of the interpreted search, max 12 words.',
    },
  },
  required: [
    'city',
    'suburb',
    'propertyType',
    'bedrooms',
    'bathrooms',
    'budgetMin',
    'budgetMax',
    'amenities',
    'summary',
  ],
} as const;

function buildPrompt(query: string, cities: string[], suburbs: string[]): string {
  return [
    'You turn a house-hunting phrase into structured search filters for a Zimbabwean accommodation app.',
    'Rents are monthly amounts in USD.',
    '',
    `Allowed property types: ${ALLOWED_TYPES.join(', ')}.`,
    `Allowed cities: ${cities.join(', ')}.`,
    `Allowed suburbs: ${suburbs.join(', ')}.`,
    `Allowed amenities: ${AMENITY_HINTS}.`,
    '',
    'Rules:',
    '- Only use values from the allowed lists. If a city or suburb is not listed, return "".',
    '- propertyType must be one of the allowed types, or "any".',
    '- "cheap" or "affordable" means budgetMax 200. "under X" means budgetMax X. "around X" means budgetMin X*0.8 and budgetMax X*1.2.',
    '- Treat "furnished" as the amenity "furnished". Also map mentions of water, borehole, electricity, solar, security, parking, garden, wifi, kitchen, laundry, aircon, generator, dstv, pets and transport to their amenity keys.',
    '- "bedsitter" or "single room" implies bedrooms 1 and the matching propertyType.',
    '- Never invent details. Use 0, "" or "any" when the user did not say.',
    '- summary must confirm what you understood in at most 12 words, for example "2 bedroom apartment in Harare under $300".',
    '',
    `Phrase: "${query}"`,
  ].join('\n');
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(asText(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function matchAllowed(value: unknown, allowed: string[]): string {
  const lowered = asText(value).toLowerCase();
  if (!lowered) return '';
  return allowed.find(item => item.toLowerCase() === lowered) ?? '';
}

function collectAmenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const matched = value
    .map(item => matchAllowed(item, ALLOWED_AMENITIES))
    .filter((item): item is string => Boolean(item));
  return [...new Set(matched)];
}

/** Converts the model output into the filter shape Explore and the database layer expect. */
function normalise(
  raw: Record<string, unknown>,
  cities: string[],
  suburbs: string[],
): PropertyFilters {
  const filters: PropertyFilters = {};
  const propertyType = matchAllowed(raw.propertyType, ALLOWED_TYPES) as PropertyType | '';
  const bedrooms = asCount(raw.bedrooms);
  const bathrooms = asCount(raw.bathrooms);
  const budgetMin = asCount(raw.budgetMin);
  const budgetMax = asCount(raw.budgetMax);
  const amenities = collectAmenities(raw.amenities);
  const city = matchAllowed(raw.city, cities);
  const suburb = matchAllowed(raw.suburb, suburbs);

  if (city) filters.city = city;
  if (suburb) filters.suburb = suburb;
  if (propertyType) filters.propertyType = propertyType;
  if (bedrooms) filters.bedrooms = bedrooms;
  if (bathrooms) filters.bathrooms = bathrooms;
  if (budgetMin) filters.budgetMin = budgetMin;
  if (budgetMax) filters.budgetMax = budgetMax;
  if (amenities.length) filters.amenities = amenities;

  return filters;
}

function readList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean).slice(0, 60);
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI search is not configured on the server.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const query = asText(body.query).slice(0, MAX_QUERY_LENGTH);
  if (!query) {
    return Response.json({ error: 'Describe what you are looking for.' }, { status: 400 });
  }

  const cities = readList(body.cities);
  const suburbs = readList(body.suburbs);

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(query, cities, suburbs) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn('[ai-search] request failed', error);
    return Response.json({ error: 'Could not reach the AI service.' }, { status: 502 });
  }

  if (!response.ok) {
    console.warn('[ai-search] gemini responded', response.status, await response.text());
    return Response.json({ error: 'The AI service rejected the request.' }, { status: 502 });
  }

  const payload: unknown = await response.json();
  const candidates = (payload as { candidates?: unknown }).candidates;
  const parts =
    Array.isArray(candidates) && candidates[0]
      ? ((candidates[0] as { content?: { parts?: unknown } }).content?.parts as
          | { text?: unknown }[]
          | undefined)
      : undefined;
  const text = Array.isArray(parts)
    ? parts.map(part => asText(part.text)).join('')
    : '';

  const parsed = extractJson(text);
  if (!parsed) {
    console.warn('[ai-search] unreadable model output', text.slice(0, 200));
    return Response.json({ error: 'Could not understand that search.' }, { status: 502 });
  }

  return Response.json({
    filters: normalise(parsed, cities, suburbs),
    summary: asText(parsed.summary) || query,
  });
}
