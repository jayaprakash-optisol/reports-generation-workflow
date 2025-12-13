/**
 * Prompts for narrative content generation
 */

import type { ReportStyle } from '../../../shared/types/index.js';

/**
 * User prompt for generating comprehensive report narrative
 */
export function getNarrativeUserPrompt(dataContext: string, style: ReportStyle): string {
  return `Based on the following data analysis, generate comprehensive report content:

DATA PROFILE:
${dataContext}

Generate a complete narrative with:
1. Executive Summary - Key takeaways for decision makers
2. 4-6 detailed sections appropriate for a ${style} report
3. 3-5 actionable recommendations
4. 5-7 key findings

Ensure all content is data-driven, professional, and appropriate for the ${style} style.`;
}
