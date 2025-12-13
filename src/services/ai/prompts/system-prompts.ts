/**
 * System prompts for AI report generation
 */

import type { ReportStyle } from '../../../shared/types/index.js';

/**
 * Base system prompt for narrative generation
 */
export function getSystemPrompt(
  style: ReportStyle,
  title: string,
  customInstructions?: string
): string {
  const stylePrompt = getStylePrompt(style);

  return `You are an expert report writer specializing in ${style} reports.
${stylePrompt}

Your task is to generate professional, insightful content for a report titled "${title}".
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}

IMPORTANT: The data context below uses TOON format (Token-Oriented Object Notation) - a compact,
schema-aware data format. TOON uses this pattern:
- Header line: arrayName[count]{field1,field2,...}:
- Data rows: value1,value2,... (one row per line, comma-separated)

Example TOON:
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user

Parse TOON data naturally - it's self-documenting once you see the header.

Respond with valid JSON in this exact format:
{
  "executiveSummary": "A concise 2-3 paragraph executive summary",
  "sections": [
    {
      "sectionId": "unique-id",
      "sectionTitle": "Section Title",
      "content": "Section content (2-4 paragraphs)",
      "order": 1
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"]
}`;
}

/**
 * Style-specific prompt instructions
 */
export function getStylePrompt(style: ReportStyle): string {
  const prompts: Record<ReportStyle, string> = {
    business: `Write in a concise, executive-friendly tone. Focus on KPIs, trends, risks, and actionable recommendations.
Lead with insights, put details in context. Use clear business language.`,

    research: `Write in a formal, structured academic tone. Include methodology considerations.
Be thorough in analysis, cite data points, discuss limitations. Use precise terminology.`,

    technical: `Write in a detailed, engineering-focused tone. Include system behaviors, metrics, and technical details.
Focus on performance data, error analysis, and root causes. Use technical terminology appropriately.`,
  };

  return prompts[style];
}
