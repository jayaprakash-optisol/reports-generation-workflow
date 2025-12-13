/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import OpenAI from 'openai';

import { config, createModuleLogger, type ILLMService } from '../../core/index.js';
import type { DataProfile, GeneratedNarrative, ReportStyle } from '../../shared/types/index.js';
import { toonUtils } from '../../shared/utils/index.js';
import { costTracker } from '../cost/index.js';

import {
  getChartAnalysisPrompt,
  getCoverImagePrompt,
  getImageGenerationPrompt,
  getNarrativeUserPrompt,
  getSectionContentPrompt,
  getSystemPrompt,
} from './prompts/index.js';

const logger = createModuleLogger('openai-service');

export class OpenAIService implements ILLMService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly imageModel: string;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.model;
    this.imageModel = config.openai.imageModel;
  }

  /**
   * Generate narrative content for the report
   */
  async generateNarrative(
    dataProfile: DataProfile,
    parsedData: Record<string, unknown>[],
    textContent: string[],
    style: ReportStyle,
    title: string,
    customInstructions?: string,
    reportId?: string
  ): Promise<GeneratedNarrative> {
    const dataContext = this.buildDataContext(dataProfile, parsedData, textContent);

    const systemPrompt = getSystemPrompt(style, title, customInstructions);
    const userPrompt = getNarrativeUserPrompt(dataContext, style);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.llm.temperature,
        max_tokens: config.llm.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Track costs
      if (response.usage && reportId) {
        await costTracker.trackOpenAIUsage(reportId, {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
        });
      }

      const parsed = JSON.parse(content) as GeneratedNarrative;
      logger.info(`Generated narrative with ${parsed.sections.length} sections`);

      return this.validateAndCleanNarrative(parsed);
    } catch (error) {
      logger.error('Failed to generate narrative', { error });
      throw new Error(`Narrative generation failed: ${error}`);
    }
  }

  /**
   * Generate section content individually (for longer reports)
   */
  async generateSectionContent(
    sectionTitle: string,
    sectionContext: string,
    style: ReportStyle,
    previousSections: string[]
  ): Promise<string> {
    const prompt = getSectionContentPrompt(sectionTitle, sectionContext, style, previousSections);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.llm.temperature,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * Generate chart explanation/analysis
   */
  async generateChartAnalysis(
    chartTitle: string,
    chartType: string,
    dataDescription: string
  ): Promise<string> {
    const prompt = getChartAnalysisPrompt(chartTitle, chartType, dataDescription);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * Generate an AI image for the report
   */
  async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
    reportId?: string
  ): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: this.imageModel,
        prompt: getImageGenerationPrompt(prompt),
        n: 1,
        size,
        response_format: 'b64_json',
      });

      const imageData = response.data?.[0]?.b64_json;
      if (!imageData) {
        throw new Error('No image data returned');
      }

      // Track image generation cost
      if (reportId) {
        await costTracker.trackOpenAIUsage(reportId, {
          imagesGenerated: 1,
        });
      }

      logger.info('Generated AI image successfully');
      return imageData;
    } catch (error) {
      logger.error('Failed to generate image', { error });
      throw error;
    }
  }

  /**
   * Generate cover page description for AI image
   */
  async generateCoverImagePrompt(title: string, style: ReportStyle): Promise<string> {
    return getCoverImagePrompt(title, style);
  }

  /**
   * Build data context string for LLM using TOON format for efficiency
   * TOON reduces token usage by ~40-60% compared to JSON
   *
   */
  private buildDataContext(
    dataProfile: DataProfile,
    parsedData: Record<string, unknown>[],
    textContent: string[]
  ): string {
    // Build metadata object
    const metadata = {
      rows: dataProfile.rowCount,
      columns: dataProfile.columnCount,
      qualityScore: dataProfile.dataQualityScore,
    };

    // Build column profiles in TOON-friendly format
    const columnProfiles = dataProfile.columns.map(col => ({
      name: col.name,
      type: col.type,
      ...(col.type === 'numeric' && {
        min: col.min,
        max: col.max,
        mean: col.mean ? Number(col.mean.toFixed(2)) : undefined,
        stdDev: col.stdDev ? Number(col.stdDev.toFixed(2)) : undefined,
      }),
      ...(col.uniqueCount && { unique: col.uniqueCount }),
      ...(col.topValues &&
        col.topValues.length > 0 && {
          top: col.topValues.slice(0, 5).map(v => `${v.value}(${v.count})`),
        }),
      ...(col.nullCount && col.nullCount > 0 && { nulls: col.nullCount }),
    }));

    // Use TOON format for data context (more token-efficient)
    let context = `DATASET METADATA (TOON format - compact data representation):
\`\`\`toon
${toonUtils.encode(metadata)}
\`\`\`

COLUMN PROFILES:
\`\`\`toon
${toonUtils.encode(columnProfiles)}
\`\`\``;

    // Sample data in TOON format
    if (parsedData.length > 0) {
      const sampleData = parsedData.slice(0, 5);
      context += `

SAMPLE DATA (first 5 rows):
\`\`\`toon
${toonUtils.encode(sampleData)}
\`\`\``;

      // Log token savings estimate
      const jsonVersion = JSON.stringify(sampleData, null, 2);
      const toonVersion = toonUtils.encode(sampleData);
      const savings = toonUtils.estimateTokenSavings(jsonVersion, toonVersion);
      logger.info(`TOON format saved ~${savings.percentage}% tokens for sample data`, {
        jsonTokens: savings.jsonTokens,
        toonTokens: savings.toonTokens,
      });
    }

    // Chart suggestions if available
    if (dataProfile.suggestedCharts && dataProfile.suggestedCharts.length > 0) {
      context += `

SUGGESTED VISUALIZATIONS:
\`\`\`toon
${toonUtils.encode(dataProfile.suggestedCharts.slice(0, 5))}
\`\`\``;
    }

    // Text content (keep as plain text for readability)
    if (textContent.length > 0) {
      context += '\n\nADDITIONAL CONTEXT:\n';
      context += textContent.slice(0, 3).join('\n---\n');
    }

    return context;
  }

  /**
   * Validate and clean narrative output
   */
  private validateAndCleanNarrative(narrative: GeneratedNarrative): GeneratedNarrative {
    // Ensure all required fields exist
    return {
      executiveSummary: narrative.executiveSummary ?? 'Executive summary not available.',
      sections: (narrative.sections ?? []).map((section, index) => ({
        sectionId: section.sectionId ?? `section-${index + 1}`,
        sectionTitle: section.sectionTitle ?? `Section ${index + 1}`,
        content: section.content ?? '',
        order: section.order ?? index + 1,
      })),
      recommendations: narrative.recommendations ?? [],
      keyFindings: narrative.keyFindings ?? [],
    };
  }
}
