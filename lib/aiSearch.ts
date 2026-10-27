import type { PropertyFilters } from '../types';
import { aiSearch as executeAiSearch } from './ai';

export interface AiSearchResult {
  filters: PropertyFilters;
  summary: string;
}

export interface AiSearchContext {
  cities: string[];
  suburbs: string[];
}

/**
 * Robust cross-platform AI search that resolves locally and through Gemini
 * without breaking on native mobile due to relative URL fetch issues.
 */
export async function interpretSearch(
  query: string,
  context: AiSearchContext,
): Promise<AiSearchResult> {
  const result = await executeAiSearch(query, context.cities);
  return {
    filters: result.filters,
    summary: result.summary,
  };
}
