import { supabase } from './supabase';
import { parseQueryLocally, sanitizeAiFilters, type AiSearchResult } from './aiFilters';

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

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Natural-language search.
 * 1. Tries Supabase `ai-search` Edge Function.
 * 2. Tries direct Gemini REST call if API key is present.
 * 3. Gracefully falls back to local keyword parsing.
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
    } catch {
      // Continue to next fallback
    }
  }

  // 2. Try Direct Gemini API
  if (GEMINI_API_KEY) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `You turn a house-hunting phrase into structured search filters for a Zimbabwean accommodation app.
Allowed cities: ${knownCities.join(', ')}.
Phrase: "${trimmed}"
Respond ONLY with a JSON object with keys:
- city (string)
- suburb (string)
- propertyType (string: house, apartment, flat, room, cottage, bedsitter, or any)
- bedrooms (number, 0 if not stated)
- bathrooms (number, 0 if not stated)
- budgetMax (number, 0 if not stated)
- amenities (array of strings, e.g. borehole, solar, durawall, wifi)
- summary (short confirmation under 12 words)`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const candidateText =
          json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          const parsed = JSON.parse(candidateText);
          return { ...sanitizeAiFilters(parsed, knownCities), source: 'ai' };
        }
      }
    } catch {
      // Continue to local parser
    }
  }

  // 3. Robust Local Parser fallback
  return { ...parseQueryLocally(trimmed, knownCities), source: 'basic' };
}

/**
 * Drafts an attractive, professional listing description.
 * 1. Tries Supabase `ai-describe` Edge Function.
 * 2. Tries direct Gemini REST call.
 * 3. Gracefully generates a high-converting Zimbabwean rental description template.
 */
export async function generateListingDescription(facts: ListingFacts): Promise<string> {
  // 1. Try Supabase Edge Function
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-describe', { body: facts });
      if (!error && data && !data.error && typeof data.description === 'string') {
        return data.description;
      }
    } catch {
      // Fall through
    }
  }

  // 2. Try Direct Gemini API
  if (GEMINI_API_KEY) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `Write an attractive, professional accommodation listing description for a rental property in Zimbabwe.
Details:
- Title: ${facts.title}
- Type: ${facts.propertyType}
- Location: ${facts.suburb}, ${facts.city}
- Bedrooms: ${facts.bedrooms}, Bathrooms: ${facts.bathrooms}
- Rent: $${facts.price}/month
- Amenities: ${facts.amenities.join(', ') || 'Standard amenities'}

Highlight security (durawall/gate), water reliability (borehole/tank), and power backup (solar) if mentioned. Keep it to 2-3 engaging, well-formatted paragraphs. No cheesy fluff.`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string') {
          return text.trim();
        }
      }
    } catch {
      // Fall through to smart template generator
    }
  }

  // 3. Smart Local Template Generator
  const amenitiesLower = facts.amenities.map(a => a.toLowerCase());
  const hasBorehole = amenitiesLower.some(a => a.includes('borehole') || a.includes('tank'));
  const hasSolar = amenitiesLower.some(a => a.includes('solar') || a.includes('inverter'));
  const hasDurawall = amenitiesLower.some(a => a.includes('durawall') || a.includes('gate') || a.includes('security'));
  const hasWifi = amenitiesLower.some(a => a.includes('wifi') || a.includes('fibre') || a.includes('internet'));

  const utilityFeatures: string[] = [];
  if (hasBorehole) utilityFeatures.push('reliable borehole water supply');
  if (hasSolar) utilityFeatures.push('solar power backup system');
  if (hasDurawall) utilityFeatures.push('fully walled & gated security (durawall)');
  if (hasWifi) utilityFeatures.push('high-speed Wi-Fi connectivity');

  const utilitySentence = utilityFeatures.length > 0
    ? `The property features ${utilityFeatures.join(', ')}, ensuring comfortable and uninterrupted living.`
    : 'Equipped with essential utilities and amenities for hassle-free living.';

  return [
    `Welcome to ${facts.title}, a well-maintained ${facts.bedrooms}-bedroom ${facts.propertyType} situated in the peaceful, convenient neighborhood of ${facts.suburb}, ${facts.city}.`,
    `Offering ${facts.bathrooms} bathroom(s) and bright, functional living spaces, this property is ideal for tenants seeking privacy, comfort, and security. ${utilitySentence}`,
    `Rented at $${facts.price}/month. Conveniently located near public transport, shopping centers, and local amenities. Early viewings are highly recommended!`,
  ].join('\n\n');
}
