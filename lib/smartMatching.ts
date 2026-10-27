import { Property } from '../types';

export interface AccommodationRequestCriteria {
  city: string;
  suburb?: string;
  propertyType?: string;
  bedrooms?: number | string;
  minBudget: number;
  maxBudget: number;
  moveInDate?: string;
  amenities?: string[];
}

export interface SmartMatchResult {
  property: Property;
  score: number; // 0 to 100
  matchReasons: string[];
  summaryReason: string;
}

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Compares an accommodation request with listings and ranks the best matches with clear reasons.
 */
export async function matchRequestToListings(
  request: AccommodationRequestCriteria,
  availableProperties: Property[]
): Promise<SmartMatchResult[]> {
  const normCity = (request.city || '').toLowerCase().trim();
  const normSuburb = (request.suburb || '').toLowerCase().trim();
  const normType = (request.propertyType || '').toLowerCase().trim();
  const reqBedrooms =
    typeof request.bedrooms === 'number'
      ? request.bedrooms
      : Number.parseInt(String(request.bedrooms), 10);
  const reqAmenities = (request.amenities || []).map((a) => a.toLowerCase());

  const scored: SmartMatchResult[] = [];

  for (const prop of availableProperties) {
    let score = 0;
    const reasons: string[] = [];

    const propCity = (prop.city || '').toLowerCase();
    const propSuburb = (prop.suburb || '').toLowerCase();
    const propType = (prop.propertyType || '').toLowerCase();
    const propAmenities = (prop.amenities || []).map((a) => a.toLowerCase());

    // 1. City Check (Must match or be close)
    if (propCity.includes(normCity) || normCity.includes(propCity)) {
      score += 35;
      reasons.push(`In ${prop.city}`);
    } else {
      // In different city, skip unless nationwide
      continue;
    }

    // Suburb Match bonus
    if (normSuburb && (propSuburb.includes(normSuburb) || normSuburb.includes(propSuburb))) {
      score += 15;
      reasons.push(`Exact neighborhood (${prop.suburb})`);
    }

    // 2. Budget Check
    if (prop.price >= request.minBudget && prop.price <= request.maxBudget) {
      score += 25;
      reasons.push(`Rent of $${prop.price}/mo is within your $${request.minBudget}-$${request.maxBudget} budget`);
    } else if (prop.price <= request.maxBudget * 1.15) {
      score += 12;
      reasons.push(`Rent ($${prop.price}/mo) is close to your budget limit`);
    }

    // 3. Bedroom Match
    if (Number.isFinite(reqBedrooms) && reqBedrooms > 0) {
      if (prop.bedrooms === reqBedrooms) {
        score += 15;
        reasons.push(`${prop.bedrooms} bedroom(s) matches requirement`);
      } else if (Math.abs(prop.bedrooms - reqBedrooms) === 1) {
        score += 8;
        reasons.push(`${prop.bedrooms} bedroom(s) offers suitable space`);
      }
    } else {
      score += 10;
    }

    // 4. Property Type Match
    if (normType && normType !== 'any') {
      if (propType === normType) {
        score += 10;
        reasons.push(`Matches desired ${prop.propertyType} property type`);
      }
    }

    // 5. Amenities Matching (Borehole, Solar, Durawall, Wi-Fi)
    const matchedAmenities: string[] = [];
    for (const reqAmenity of reqAmenities) {
      if (propAmenities.some((p) => p.includes(reqAmenity) || reqAmenity.includes(p))) {
        matchedAmenities.push(reqAmenity);
      }
    }

    if (matchedAmenities.length > 0) {
      score += Math.min(15, matchedAmenities.length * 5);
      reasons.push(`Includes ${matchedAmenities.slice(0, 3).join(', ')}`);
    }

    // Build synthesized reason summary
    const summaryReason = reasons.slice(0, 3).join(' • ');

    scored.push({
      property: prop,
      score: Math.min(100, score),
      matchReasons: reasons,
      summaryReason,
    });
  }

  // Sort descending by score
  const topMatches = scored.sort((a, b) => b.score - a.score).slice(0, 6);

  // If Gemini API is reachable, enhance the top match reasons with personalized AI rationale
  if (GEMINI_API_KEY && topMatches.length > 0) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `A renter in Zimbabwe requested:
- Location: ${request.city} (${request.suburb || 'any suburb'})
- Budget: $${request.minBudget} - $${request.maxBudget}
- Bedrooms: ${request.bedrooms || 'any'}
- Amenities: ${request.amenities?.join(', ') || 'Standard'}

Write 1 short sentence (under 16 words) explaining why this property is a great match:
Property: "${topMatches[0].property.title}" in ${topMatches[0].property.suburb}, ${topMatches[0].property.city}, $${topMatches[0].property.price}/mo, ${topMatches[0].property.bedrooms} beds.`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string') {
          topMatches[0].summaryReason = text.trim();
        }
      }
    } catch {
      // Fallback already assigned
    }
  }

  return topMatches;
}
