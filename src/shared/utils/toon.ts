/**
 * TOON (Token-Oriented Object Notation) Utility Service
 * Provides efficient encoding/decoding for LLM interactions
 * @see https://github.com/toon-format/toon
 */

import { decode, encode } from '@toon-format/toon';

import { createModuleLogger } from '../../core/logger/index.js';

const logger = createModuleLogger('toon-utils');

/**
 * Encode data to TOON format for LLM prompts
 * Significantly reduces token usage compared to JSON
 */
export function encodeToon<T>(data: T): string {
  try {
    return encode(data);
  } catch (error) {
    logger.error('Failed to encode data to TOON format', { error });
    // Fallback to JSON if TOON encoding fails
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Decode TOON format response from LLM
 */
export function decodeToon<T>(toonString: string): T {
  try {
    return decode(toonString) as T;
  } catch (error) {
    logger.error('Failed to decode TOON format', { error });
    // Try parsing as JSON fallback
    return JSON.parse(toonString) as T;
  }
}

/**
 * Encode tabular data efficiently for LLM context
 */
export function encodeTableData(headers: string[], rows: Record<string, unknown>[]): string {
  const data = rows.map(row => {
    const values: Record<string, unknown> = {};
    for (const header of headers) {
      values[header] = row[header];
    }
    return values;
  });

  return encodeToon(data);
}

/**
 * Encode column profile data for LLM context
 */
export function encodeColumnProfiles(
  columns: Array<{
    name: string;
    type: string;
    min?: number;
    max?: number;
    mean?: number;
    uniqueCount?: number;
    topValues?: Array<{ value: string; count: number }>;
  }>
): string {
  const profileData = columns.map(col => ({
    name: col.name,
    type: col.type,
    ...(col.type === 'numeric' && {
      min: col.min,
      max: col.max,
      mean: col.mean?.toFixed(2),
    }),
    ...(col.uniqueCount && { unique: col.uniqueCount }),
    ...(col.topValues && {
      top: col.topValues.slice(0, 5).map(v => v.value),
    }),
  }));

  return encodeToon(profileData);
}

/**
 * Create a TOON-formatted prompt section
 */
export function createToonPromptSection(sectionName: string, data: unknown): string {
  return `\`\`\`toon
# ${sectionName}
${encodeToon(data)}
\`\`\``;
}

/**
 * Parse LLM response that may contain TOON blocks
 */
export function parseToonResponse<T>(response: string): T | null {
  // Try to extract TOON block from response
  const toonMatch = response.match(/```toon\s*([\s\S]*?)\s*```/);
  if (toonMatch?.[1]) {
    try {
      return decodeToon<T>(toonMatch[1]);
    } catch {
      logger.warn('Failed to parse TOON block, trying JSON fallback');
    }
  }

  // Try to extract JSON block
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch?.[1]) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      logger.warn('Failed to parse JSON block');
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(response) as T;
  } catch {
    logger.warn('Failed to parse response as JSON');
    return null;
  }
}

/**
 * Calculate token savings estimate (rough approximation)
 */
export function estimateTokenSavings(
  jsonData: string,
  toonData: string
): { jsonTokens: number; toonTokens: number; savings: number; percentage: number } {
  // Rough token estimation: ~4 chars per token
  const jsonTokens = Math.ceil(jsonData.length / 4);
  const toonTokens = Math.ceil(toonData.length / 4);
  const savings = jsonTokens - toonTokens;
  const percentage = Math.round((savings / jsonTokens) * 100);

  return { jsonTokens, toonTokens, savings, percentage };
}

export const toonUtils = {
  encode: encodeToon,
  decode: decodeToon,
  encodeTableData,
  encodeColumnProfiles,
  createToonPromptSection,
  parseToonResponse,
  estimateTokenSavings,
};
