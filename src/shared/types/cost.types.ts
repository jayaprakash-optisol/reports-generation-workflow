/**
 * Cost Tracking Types
 * Types for tracking and reporting OpenAI API costs
 */

/**
 * Cost metrics for a report
 */
export interface CostMetrics {
  reportId: string;
  timestamp: string;
  openai: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    imagesGenerated: number;
    estimatedCost: number;
  };
}

/**
 * Aggregated cost statistics across all reports
 */
export interface AggregatedCosts {
  totalReports: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerReport: number;
}
