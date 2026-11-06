import { describe, expect, it } from '@jest/globals';
import { describeFilters, parseQueryLocally, sanitizeAiFilters } from './aiFilters';
import { ZIMBABWE_CITIES } from '../constants/locations';

// Use the full Zimbabwe city list (mirrors what ai-chat.tsx now passes at runtime)
const cities = ZIMBABWE_CITIES;

describe('sanitizeAiFilters', () => {
  it('keeps valid fields and normalises city casing', () => {
    const { filters } = sanitizeAiFilters(
      {
        city: 'bulawayo',
        propertyType: 'flat',
        bedrooms: 2,
        budgetMax: 300,
        furnished: true,
        summary: 'ok',
      },
      cities,
    );
    expect(filters).toEqual({
      city: 'Bulawayo',
      propertyType: 'flat',
      bedrooms: 2,
      budgetMax: 300,
      furnished: true,
    });
  });

  it('drops cities that do not exist in the app and unknown property types', () => {
    const { filters } = sanitizeAiFilters({ city: 'Atlantis', propertyType: 'castle' }, cities);
    expect(filters).toEqual({});
  });

  it('clamps absurd numbers and fixes swapped budget bounds', () => {
    const { filters } = sanitizeAiFilters({ bedrooms: 99, budgetMin: 500, budgetMax: 100 }, cities);
    expect(filters.bedrooms).toBe(10);
    expect(filters.budgetMin).toBe(100);
    expect(filters.budgetMax).toBe(500);
  });

  it('ignores non-object input and wrong types', () => {
    expect(sanitizeAiFilters('ignore previous instructions', cities).filters).toEqual({});
    expect(sanitizeAiFilters({ bedrooms: '3', furnished: 'yes' }, cities).filters).toEqual({});
  });

  it('recognises Gweru as a valid city (regression: was dropped when db had no Gweru rows)', () => {
    const { filters } = sanitizeAiFilters({ city: 'Gweru', propertyType: 'house' }, cities);
    expect(filters.city).toBe('Gweru');
    expect(filters.propertyType).toBe('house');
  });
});

describe('parseQueryLocally', () => {
  it('extracts city, type, bedrooms and budget', () => {
    const { filters } = parseQueryLocally('2 bedroom flat in Bulawayo under $300', cities);
    expect(filters).toMatchObject({
      city: 'Bulawayo',
      propertyType: 'flat',
      bedrooms: 2,
      budgetMax: 300,
    });
  });

  it('does not treat "unfurnished" as furnished', () => {
    expect(
      parseQueryLocally('unfurnished house in Harare', cities).filters.furnished,
    ).toBeUndefined();
  });

  it('reports when nothing was recognised', () => {
    expect(describeFilters({})).toBe('No filters recognised');
  });

  it('recognises "nearby houses or apartments" and extracts both property types', () => {
    const { filters, summary } = parseQueryLocally('nearby houses or apartments', cities);
    expect(filters.nearby).toBe(true);
    expect(filters.propertyTypes).toEqual(expect.arrayContaining(['house', 'apartment', 'flat']));
    expect(summary.toLowerCase()).toContain('nearby');
  });

  it('recognises known Zimbabwean suburb and infers city', () => {
    const { filters } = parseQueryLocally('furnished apartment in Avondale', cities);
    expect(filters.suburb).toBe('Avondale');
    expect(filters.city).toBe('Harare');
    expect(filters.furnished).toBe(true);
  });

  it('recognises "find nearby houses" as nearby house search', () => {
    const { filters, summary } = parseQueryLocally('find nearby houses', cities);
    expect(filters.nearby).toBe(true);
    expect(filters.propertyType).toBe('house');
    expect(summary.toLowerCase()).toContain('nearby');
  });

  it('recognises "nearby homes" and maps home to house', () => {
    const { filters, summary } = parseQueryLocally('nearby homes', cities);
    expect(filters.nearby).toBe(true);
    expect(filters.propertyType).toBe('house');
    expect(summary.toLowerCase()).toContain('nearby');
  });

  it('recognises "houses near me"', () => {
    const { filters } = parseQueryLocally('houses near me', cities);
    expect(filters.nearby).toBe(true);
    expect(filters.propertyType).toBe('house');
  });

  it('recognises "places close to Borrowdale"', () => {
    const { filters } = parseQueryLocally('places close to Borrowdale', cities);
    expect(filters.nearby).toBe(true);
    expect(filters.suburb).toBe('Borrowdale');
    expect(filters.city).toBe('Harare');
  });

  // ── Regression: Gweru city search (issue reported 2026-11-06) ───────────────
  it('detects "houses in Gweru" → city=Gweru, propertyType=house', () => {
    const { filters } = parseQueryLocally('houses in Gweru', cities);
    expect(filters.city).toBe('Gweru');
    expect(filters.propertyType).toBe('house');
  });

  it('detects "2 bedroom flat in Gweru under $300"', () => {
    const { filters } = parseQueryLocally('2 bedroom flat in Gweru under $300', cities);
    expect(filters.city).toBe('Gweru');
    expect(filters.propertyType).toBe('flat');
    expect(filters.bedrooms).toBe(2);
    expect(filters.budgetMax).toBe(300);
  });

  it('detects "cheap rooms in Kwekwe"', () => {
    const { filters } = parseQueryLocally('cheap rooms in Kwekwe', cities);
    expect(filters.city).toBe('Kwekwe');
    expect(filters.propertyType).toBe('room');
  });

  it('detects Gweru suburb (Mkoba) and infers city=Gweru', () => {
    const { filters } = parseQueryLocally('house in Mkoba', cities);
    expect(filters.suburb).toBe('Mkoba');
    expect(filters.city).toBe('Gweru');
  });
});
