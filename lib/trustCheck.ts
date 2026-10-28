import { Property } from '../types';
import { supabase } from './supabase';

export interface TrustFlag {
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  source?: 'rules' | 'ai';
}

export interface PriceBenchmark {
  min: number;
  max: number;
  typical: number;
}

export interface TrustCheckResult {
  score: number; // 0 to 100
  status: 'low_risk' | 'moderate_risk' | 'high_risk';
  headline: string;
  explanation: string;
  flags: TrustFlag[];
  priceAnalysis: {
    isUnusuallyLow: boolean;
    isUnusuallyHigh: boolean;
    typicalRange: { min: number; max: number };
    message: string;
  };
  advice: string;
}

function getDescriptionWords(description: string): Set<string> {
  const commonWords = new Set([
    'about', 'also', 'and', 'are', 'available', 'bedroom', 'bedrooms', 'close', 'for',
    'from', 'has', 'have', 'house', 'into', 'located', 'near', 'offers', 'property',
    'that', 'the', 'this', 'with',
  ]);
  return new Set(
    description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word)),
  );
}

function hasPossibleReusedDescription(property: Property, allProperties: Property[]): boolean {
  const words = getDescriptionWords(property.description || '');
  if (words.size < 8) return false;

  return allProperties.some((other) => {
    if (other.id === property.id) return false;
    const otherWords = getDescriptionWords(other.description || '');
    if (otherWords.size < 8) return false;
    const sharedWords = [...words].filter((word) => otherWords.has(word)).length;
    return sharedWords / Math.min(words.size, otherWords.size) >= 0.9;
  });
}

function getComparableBenchmark(
  property: Property,
  allProperties: Property[],
): PriceBenchmark | null {
  const comparablePrices = allProperties
    .filter((other) =>
      other.id !== property.id &&
      other.available &&
      other.city.toLowerCase().trim() === property.city.toLowerCase().trim() &&
      other.propertyType === property.propertyType &&
      Math.abs(other.bedrooms - property.bedrooms) <= 1 &&
      other.price > 0,
    )
    .map((other) => other.price)
    .sort((a, b) => a - b);

  if (comparablePrices.length < 3) return null;

  const middle = Math.floor(comparablePrices.length / 2);
  const typical =
    comparablePrices.length % 2 === 0
      ? (comparablePrices[middle - 1] + comparablePrices[middle]) / 2
      : comparablePrices[middle];

  return {
    min: comparablePrices[0],
    max: comparablePrices[comparablePrices.length - 1],
    typical,
  };
}

/**
 * Returns typical market price benchmarks for Zimbabwean cities and property configurations.
 */
export function getMarketBenchmark(
  city: string,
  propertyType: string = 'house',
  bedrooms: number = 2
): PriceBenchmark {
  const normCity = city.toLowerCase().trim();
  const normType = propertyType.toLowerCase().trim();

  const isHarare = normCity.includes('harare') || normCity.includes('chitungwiza');
  const isBulawayo = normCity.includes('bulawayo');

  if (normType === 'room' || normType === 'bedsitter' || bedrooms === 0) {
    if (isHarare) return { min: 70, max: 200, typical: 120 };
    if (isBulawayo) return { min: 50, max: 150, typical: 90 };
    return { min: 40, max: 120, typical: 70 };
  }

  if (normType === 'cottage' || bedrooms === 1) {
    if (isHarare) return { min: 180, max: 450, typical: 280 };
    if (isBulawayo) return { min: 130, max: 320, typical: 200 };
    return { min: 100, max: 250, typical: 160 };
  }

  if (bedrooms === 2) {
    if (isHarare) return { min: 300, max: 700, typical: 450 };
    if (isBulawayo) return { min: 200, max: 450, typical: 300 };
    return { min: 150, max: 350, typical: 220 };
  }

  if (bedrooms >= 3) {
    if (isHarare) return { min: 450, max: 1600, typical: 750 };
    if (isBulawayo) return { min: 300, max: 800, typical: 480 };
    return { min: 220, max: 600, typical: 350 };
  }

  return { min: 150, max: 500, typical: 280 };
}

/**
 * Performs rule-based scam and trust signals evaluation on a listing.
 */
export function evaluateListingRules(
  property: Property,
  allProperties: Property[] = []
): {
  flags: TrustFlag[];
  priceAnalysis: TrustCheckResult['priceAnalysis'];
  baseScore: number;
} {
  const flags: TrustFlag[] = [];
  let deduction = 0;

  const desc = (property.description || '').toLowerCase();
  const fallbackBenchmark = getMarketBenchmark(
    property.city || '',
    property.propertyType,
    property.bedrooms
  );
  const comparableBenchmark = getComparableBenchmark(property, allProperties);
  const hasComparableListings = comparableBenchmark !== null;
  const benchmark = comparableBenchmark ?? fallbackBenchmark;

  // 1. Advance Payment / Deposit before Viewing (Highest Risk)
  const advancePaymentPatterns = [
    /pay\s*(a\s*)?(deposit|fee|money)\s*before\s*(viewing|seeing|inspection)/i,
    /deposit\s*to\s*(reserve|hold|book)\s*(a\s*)?viewing/i,
    /send\s*(ecocash|innbucks|money|funds)\s*(first|prior|before)/i,
    /viewing\s*fee/i,
    /commit(ment)?\s*fee/i,
  ];

  let hasAdvancePaymentFlag = false;
  for (const pattern of advancePaymentPatterns) {
    if (pattern.test(desc)) {
      hasAdvancePaymentFlag = true;
      break;
    }
  }

  if (hasAdvancePaymentFlag) {
    flags.push({
      severity: 'high',
      title: 'Advance Payment Request Detected',
      description:
        'The listing mentions a deposit or fee before physical viewing. Treat advance payment requests as a warning sign and inspect the property before paying.',
    });
    deduction += 45;
  }

  // 2. Price Far Below Market Benchmark (Scam Bait)
  let isUnusuallyLow = false;
  let isUnusuallyHigh = false;
  let priceMessage = hasComparableListings
    ? `Compared with similar available listings in ${property.city}, the observed range is $${benchmark.min} - $${benchmark.max}/mo.`
    : `Price is within typical market range for ${property.bedrooms}-bedroom rentals in ${property.city} ($${benchmark.min} - $${benchmark.max}/mo).`;

  const lowPriceThreshold = hasComparableListings
    ? benchmark.typical * 0.5
    : benchmark.min * 0.55;
  const highPriceThreshold = hasComparableListings
    ? benchmark.typical * 2
    : benchmark.max * 1.8;

  if (property.price < lowPriceThreshold && property.price > 0) {
    isUnusuallyLow = true;
    priceMessage = `Price ($${property.price}) is unusually low for a ${property.bedrooms}-bedroom ${property.propertyType} in ${property.city} (typical: $${benchmark.min} - $${benchmark.max}). Verify carefully.`;
    flags.push({
      severity: 'high',
      title: 'Price Far Below Market Rates',
      description: `At $${property.price}/mo, this is significantly cheaper than typical rentals in ${property.city} ($${benchmark.min}-$${benchmark.max}). Scammers often use unrealistically low prices as bait.`,
    });
    deduction += 35;
  } else if (property.price > highPriceThreshold) {
    isUnusuallyHigh = true;
    priceMessage = `Price ($${property.price}) is on the higher end for this area. Ensure the premium is justified by utilities and finishes.`;
    flags.push({
      severity: 'info',
      title: 'Above Average Market Price',
      description: `At $${property.price}/mo, this is positioned as a luxury or premium listing compared to the standard $${benchmark.min}-$${benchmark.max} range.`,
    });
    deduction += 5;
  }

  // 3. Location and Address Specificity
  const suburb = (property.suburb || '').trim();
  const isVagueLocation =
    !suburb ||
    suburb.toLowerCase() === property.city.toLowerCase() ||
    suburb.length < 3;

  if (isVagueLocation) {
    flags.push({
      severity: 'medium',
      title: 'Vague or Missing Neighborhood',
      description:
        'Specific suburb or street was not provided. Ask the landlord for the exact neighborhood before scheduling a viewing.',
    });
    deduction += 15;
  }

  // 4. Description Clarity and Length
  if (!property.description || property.description.trim().length < 40) {
    flags.push({
      severity: 'medium',
      title: 'Very Short Description',
      description:
        'The listing lacks comprehensive details regarding lease terms, borehole/water reliability, or electricity arrangements.',
    });
    deduction += 10;
  }

  if (hasPossibleReusedDescription(property, allProperties)) {
    flags.push({
      severity: 'medium',
      title: 'Possible Reused Description',
      description:
        'This description closely resembles another listing. Ask the landlord to confirm that it accurately describes this specific property.',
      source: 'rules',
    });
    deduction += 10;
  }

  // 5. Landlord Verification Check
  if (property.landlord?.verified) {
    flags.push({
      severity: 'info',
      title: 'Verified Landlord Badge',
      description:
        'This landlord has undergone administrative identity verification with ImbaFind.',
    });
  } else {
    flags.push({
      severity: 'low',
      title: 'Unverified Landlord Profile',
      description:
        'This landlord has not yet completed optional admin identity verification.',
    });
    deduction += 5;
  }

  // 6. Photos Check
  if (!property.images || property.images.length === 0) {
    flags.push({
      severity: 'medium',
      title: 'No Photos Uploaded',
      description:
        'Listings without photos carry higher uncertainty. Request real photos or a live video call.',
    });
    deduction += 20;
  }

  const score = Math.max(10, Math.min(100, 100 - deduction));

  return {
    flags,
    priceAnalysis: {
      isUnusuallyLow,
      isUnusuallyHigh,
      typicalRange: { min: benchmark.min, max: benchmark.max },
      message: priceMessage,
    },
    baseScore: score,
  };
}

/**
 * Runs the complete Listing Trust Check combining rules and AI synthesis.
 */
export async function performListingTrustCheck(
  property: Property,
  allProperties: Property[] = []
): Promise<TrustCheckResult> {
  const { flags: ruleFlags, priceAnalysis, baseScore } = evaluateListingRules(
    property,
    allProperties
  );

  const flags = [...ruleFlags];
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-trust', {
        body: {
          title: property.title,
          city: property.city,
          suburb: property.suburb,
          price: property.price,
          bedrooms: property.bedrooms,
          propertyType: property.propertyType,
          description: (property.description || '').slice(0, 300),
        },
      });
      const warningDetails: Record<string, Omit<TrustFlag, 'source'>> = {
        vague_description: {
          severity: 'medium',
          title: 'Vague Description',
          description:
            'The AI found that the description may not provide enough specific information. Ask the landlord about the property details before arranging a viewing.',
        },
        generic_description: {
          severity: 'low',
          title: 'Generic Description',
          description:
            'The description may apply to many properties rather than this specific one. Confirm the features and condition during your viewing.',
        },
        missing_practical_details: {
          severity: 'low',
          title: 'Practical Details Missing',
          description:
            'The description may not explain practical details such as water, electricity, or lease arrangements. Ask the landlord before deciding.',
        },
      };
      if (!error && data && Array.isArray(data.warnings)) {
        for (const warning of data.warnings) {
          if (typeof warning !== 'string' || !warningDetails[warning]) continue;
          if (flags.some((flag) => flag.title === warningDetails[warning].title)) continue;
          flags.push({ ...warningDetails[warning], source: 'ai' });
        }
      } else if (error) {
        console.warn('[TrustCheck] AI description analysis unavailable; using rule checks.');
      }
    } catch (error) {
      console.warn(
        '[TrustCheck] AI description analysis failed; using rule checks:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const score = Math.max(
    10,
    Math.min(100, baseScore - flags.filter((flag) => flag.source === 'ai').length * 7),
  );
  let status: TrustCheckResult['status'] = 'low_risk';
  let headline = 'Trust Check: Standard Listing';
  let advice =
    'Always physically inspect this property and meet the landlord before transferring any deposit or rental money.';

  if (score < 50 || flags.some((f) => f.severity === 'high')) {
    status = 'high_risk';
    headline = 'Trust Check: Warning Signs Detected';
    advice =
      'Exercise caution: Major warning signs were detected. Do NOT send any reservation fee or advance deposit before inspecting the property.';
  } else if (score < 75 || flags.some((f) => f.severity === 'medium')) {
    status = 'moderate_risk';
    headline = 'Trust Check: Items to Verify';
    advice =
      'Review missing details with the landlord and insist on an on-site viewing before making any payment.';
  }

  const concernTitles = flags
    .filter((flag) => flag.severity === 'high' || flag.severity === 'medium')
    .map((flag) => flag.title);
  const explanation = concernTitles.length
    ? `Caution recommended. Check these listing signals: ${concernTitles.join(', ')}. The trust check cannot verify ownership, so always inspect in person.`
    : `No major warning signs were found in the listing details. The trust check cannot verify ownership, so always inspect in person.`;

  return {
    score,
    status,
    headline,
    explanation,
    flags,
    priceAnalysis,
    advice,
  };
}
