import { Property } from '../types';

export interface TrustFlag {
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
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

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

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
  const benchmark = getMarketBenchmark(
    property.city || '',
    property.propertyType,
    property.bedrooms
  );

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
        'The listing mentions a deposit or fee before physical viewing. In Zimbabwe, genuine landlords never demand payment to view accommodation.',
    });
    deduction += 45;
  }

  // 2. Price Far Below Market Benchmark (Scam Bait)
  let isUnusuallyLow = false;
  let isUnusuallyHigh = false;
  let priceMessage = `Price is within typical market range for ${property.bedrooms}-bedroom rentals in ${property.city} ($${benchmark.min} - $${benchmark.max}/mo).`;

  if (property.price < benchmark.min * 0.55 && property.price > 0) {
    isUnusuallyLow = true;
    priceMessage = `Price ($${property.price}) is unusually low for a ${property.bedrooms}-bedroom ${property.propertyType} in ${property.city} (typical: $${benchmark.min} - $${benchmark.max}). Verify carefully.`;
    flags.push({
      severity: 'high',
      title: 'Price Far Below Market Rates',
      description: `At $${property.price}/mo, this is significantly cheaper than typical rentals in ${property.city} ($${benchmark.min}-$${benchmark.max}). Scammers often use unrealistically low prices as bait.`,
    });
    deduction += 35;
  } else if (property.price > benchmark.max * 1.8) {
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
  const { flags, priceAnalysis, baseScore } = evaluateListingRules(
    property,
    allProperties
  );

  let status: TrustCheckResult['status'] = 'low_risk';
  let headline = 'Trust Check: Standard Listing';
  let advice =
    'Always physically inspect this property and meet the landlord before transferring any deposit or rental money.';

  if (baseScore < 50 || flags.some((f) => f.severity === 'high')) {
    status = 'high_risk';
    headline = 'Trust Check: Warning Signs Detected';
    advice =
      'Exercise caution: Major warning signs were detected. Do NOT send any reservation fee or advance deposit before inspecting the property.';
  } else if (baseScore < 75 || flags.some((f) => f.severity === 'medium')) {
    status = 'moderate_risk';
    headline = 'Trust Check: Items to Verify';
    advice =
      'Review missing details with the landlord and insist on an on-site viewing before making any payment.';
  }

  // Generate plain-language explanation combining the flagged items
  let explanation = '';
  if (status === 'high_risk') {
    const highReasons = flags
      .filter((f) => f.severity === 'high' || f.severity === 'medium')
      .map((f) => f.title)
      .join(', ');
    explanation = `Caution recommended. This listing was flagged for: ${highReasons}. Remember that AI cannot verify ownership, so you should always inspect in person.`;
  } else if (status === 'moderate_risk') {
    const modReasons = flags
      .filter((f) => f.severity === 'medium' || f.severity === 'low')
      .map((f) => f.title)
      .join(', ');
    explanation = `Listing appears mostly standard, but note: ${modReasons}. Verify water and power backup during your viewing.`;
  } else {
    explanation = `Details appear consistent with similar listings in ${property.city}. Price is within market norms and no red-flag payment demands were found.`;
  }

  // If Gemini API is reachable, enhance with AI reasoning
  if (GEMINI_API_KEY) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `You are the ImbaFind Listing Trust Check AI for Zimbabwean rentals.
Analyze this listing to protect renters from scams:
- Title: ${property.title}
- City: ${property.city}, Suburb: ${property.suburb}
- Price: $${property.price}/month
- Bedrooms: ${property.bedrooms}, Type: ${property.propertyType}
- Description: "${(property.description || '').slice(0, 300)}"
- Known Flags: ${flags.map((f) => f.title).join('; ')}

Return a concise 2-sentence plain-language trust check summary for a renter in Zimbabwe, explaining what to verify and reminding them never to pay before physical viewing.`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const aiText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && typeof aiText === 'string') {
          explanation = aiText.trim();
        }
      }
    } catch {
      // Keep synthesized explanation
    }
  }

  return {
    score: baseScore,
    status,
    headline,
    explanation,
    flags,
    priceAnalysis,
    advice,
  };
}
