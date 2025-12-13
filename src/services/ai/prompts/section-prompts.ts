/**
 * Prompts for individual section content generation
 */

import type { ReportStyle } from '../../../shared/types/index.js';

/**
 * Prompt for generating individual section content
 */
export function getSectionContentPrompt(
  sectionTitle: string,
  sectionContext: string,
  style: ReportStyle,
  previousSections: string[]
): string {
  return `Generate detailed content for the "${sectionTitle}" section of a ${style} report.

Context: ${sectionContext}
${previousSections.length > 0 ? `\nPrevious sections covered: ${previousSections.join(', ')}` : ''}

Write 2-4 paragraphs of professional, insightful content. Be specific and data-driven where possible.`;
}
