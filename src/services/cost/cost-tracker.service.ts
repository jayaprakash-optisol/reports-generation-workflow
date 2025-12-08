import { config, createModuleLogger } from '../../core/index.js';
import { storage } from '../index.js';

const logger = createModuleLogger('cost-tracker');

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

export class CostTrackerService {
  private static readonly COST_METRICS_KEY = 'cost-metrics';

  /**
   * Track OpenAI API usage and calculate costs
   */
  async trackOpenAIUsage(
    reportId: string,
    usage: {
      promptTokens?: number;
      completionTokens?: number;
      imagesGenerated?: number;
    }
  ): Promise<CostMetrics> {
    const existing = await this.getCostMetrics(reportId);

    const metrics: CostMetrics = {
      reportId,
      timestamp: new Date().toISOString(),
      openai: {
        promptTokens: (existing?.openai.promptTokens ?? 0) + (usage.promptTokens ?? 0),
        completionTokens: (existing?.openai.completionTokens ?? 0) + (usage.completionTokens ?? 0),
        totalTokens: 0,
        imagesGenerated: (existing?.openai.imagesGenerated ?? 0) + (usage.imagesGenerated ?? 0),
        estimatedCost: 0,
      },
    };

    metrics.openai.totalTokens = metrics.openai.promptTokens + metrics.openai.completionTokens;
    metrics.openai.estimatedCost = this.calculateCost(metrics.openai);

    await this.saveCostMetrics(reportId, metrics);

    logger.info(`Cost tracked for report ${reportId}`, {
      tokens: metrics.openai.totalTokens,
      cost: metrics.openai.estimatedCost,
    });

    return metrics;
  }

  /**
   * Get cost metrics for a report
   */
  async getCostMetrics(reportId: string): Promise<CostMetrics | null> {
    try {
      const data = await storage.getReport(`${reportId}-costs`);
      return data as CostMetrics | null;
    } catch {
      return null;
    }
  }

  /**
   * Calculate estimated cost based on OpenAI pricing
   */
  private calculateCost(usage: {
    promptTokens: number;
    completionTokens: number;
    imagesGenerated: number;
  }): number {
    if (!config.costTracking.enabled) {
      return 0;
    }

    const inputCost = (usage.promptTokens / 1000) * config.costTracking.openai.inputCostPer1K;
    const outputCost = (usage.completionTokens / 1000) * config.costTracking.openai.outputCostPer1K;
    const imageCost = usage.imagesGenerated * config.costTracking.openai.imageCostPerImage;

    return Number.parseFloat((inputCost + outputCost + imageCost).toFixed(4));
  }

  /**
   * Save cost metrics
   */
  private async saveCostMetrics(reportId: string, metrics: CostMetrics): Promise<void> {
    await storage.saveReport(`${reportId}-costs`, metrics);
  }

  /**
   * Get aggregated costs across all reports
   */
  async getAggregatedCosts(): Promise<{
    totalReports: number;
    totalTokens: number;
    totalCost: number;
    averageCostPerReport: number;
  }> {
    const reportIds = await storage.listReports();
    const costReports = reportIds.filter(id => id.endsWith('-costs'));

    let totalTokens = 0;
    let totalCost = 0;

    for (const reportId of costReports) {
      const metrics = await this.getCostMetrics(reportId.replace('-costs', ''));
      if (metrics) {
        totalTokens += metrics.openai.totalTokens;
        totalCost += metrics.openai.estimatedCost;
      }
    }

    return {
      totalReports: costReports.length,
      totalTokens,
      totalCost: Number.parseFloat(totalCost.toFixed(4)),
      averageCostPerReport:
        costReports.length > 0 ? Number.parseFloat((totalCost / costReports.length).toFixed(4)) : 0,
    };
  }
}

export const costTracker = new CostTrackerService();

