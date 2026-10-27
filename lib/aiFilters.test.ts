import { describe, expect, it } from '@jest/globals';
import { describeFilters, parseQueryLocally, sanitizeAiFilters } from './aiFilters';

const cities = ['Harare', 'Bulawayo', 'Masvingo'];

describe('sanitizeAiFilters', () => {
  it('keeps valid fields and normalises city casing', () => {
    const { filters } = sanitizeAiFilters(
      { city: 'bulawayo', propertyType: 'flat', bedrooms: 2, budgetMax: 300, furnished: true, summary: 'ok' },
      cities,
    );
    expect(filters).toEqual({
      city: 'Bulawayo', propertyType: 'flat', bedrooms: 2, budgetMax: 300, furnished: true,
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
});

describe('parseQueryLocally', () => {
  it('extracts city, type, bedrooms and budget', () => {
    const { filters } = parseQueryLocally('2 bedroom flat in Bulawayo under $300', cities);
    expect(filters).toMatchObject({ city: 'Bulawayo', propertyType: 'flat', bedrooms: 2, budgetMax: 300 });
  });

  it('does not treat "unfurnished" as furnished', () => {
    expect(parseQueryLocally('unfurnished house in Harare', cities).filters.furnished).toBeUndefined();
  });

  it('reports when nothing was recognised', () => {
    expect(describeFilters({})).toBe('No filters recognised');
  });
});
