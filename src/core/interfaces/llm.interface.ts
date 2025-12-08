import type { DataProfile, GeneratedNarrative, ReportStyle } from '../../shared/types/index.js';

/**
 * LLM Service Interface
 * Defines the contract for AI/LLM operations
 */
export interface ILLMService {
  /**
   * Generate narrative content for the report
   */
  generateNarrative(
    dataProfile: DataProfile,
    parsedData: Record<string, unknown>[],
    textContent: string[],
    style: ReportStyle,
    title: string,
    customInstructions?: string,
    reportId?: string
  ): Promise<GeneratedNarrative>;

  /**
   * Generate section content individually (for longer reports)
   */
  generateSectionContent(
    sectionTitle: string,
    sectionContext: string,
    style: ReportStyle,
    previousSections: string[]
  ): Promise<string>;

  /**
   * Generate chart explanation/analysis
   */
  generateChartAnalysis(
    chartTitle: string,
    chartType: string,
    dataDescription: string
  ): Promise<string>;

  /**
   * Generate an AI image for the report
   */
  generateImage(prompt: string, size?: '1024x1024' | '1792x1024' | '1024x1792', reportId?: string): Promise<string>;

  /**
   * Generate cover page description for AI image
   */
  generateCoverImagePrompt(title: string, style: ReportStyle): Promise<string>;
}
