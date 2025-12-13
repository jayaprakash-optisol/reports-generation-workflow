/**
 * Prompts for chart analysis and explanation
 */

/**
 * Prompt for analyzing and explaining a chart
 */
export function getChartAnalysisPrompt(
  chartTitle: string,
  chartType: string,
  dataDescription: string
): string {
  return `Analyze this ${chartType} chart titled "${chartTitle}".

Data description: ${dataDescription}

Write a brief 1-2 paragraph analysis explaining:
1. What the chart shows
2. Key trends or patterns
3. Notable outliers or anomalies (if any)

Be concise and insight-driven.`;
}
