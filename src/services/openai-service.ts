import OpenAI from 'openai';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { ReportStyle, DataProfile, GeneratedNarrative } from '../types/index.js';

const logger = createModuleLogger('openai-service');

export class OpenAIService {
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
    customInstructions?: string
  ): Promise<GeneratedNarrative> {
    const stylePrompt = this.getStylePrompt(style);
    const dataContext = this.buildDataContext(dataProfile, parsedData, textContent);

    const systemPrompt = `You are an expert report writer specializing in ${style} reports. 
${stylePrompt}

Your task is to generate professional, insightful content for a report titled "${title}".
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}

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

    const userPrompt = `Based on the following data analysis, generate comprehensive report content:

DATA PROFILE:
${dataContext}

Generate a complete narrative with:
1. Executive Summary - Key takeaways for decision makers
2. 4-6 detailed sections appropriate for a ${style} report
3. 3-5 actionable recommendations
4. 5-7 key findings

Ensure all content is data-driven, professional, and appropriate for the ${style} style.`;

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
    const prompt = `Generate detailed content for the "${sectionTitle}" section of a ${style} report.

Context: ${sectionContext}
${previousSections.length > 0 ? `\nPrevious sections covered: ${previousSections.join(', ')}` : ''}

Write 2-4 paragraphs of professional, insightful content. Be specific and data-driven where possible.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.llm.temperature,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate chart explanation/analysis
   */
  async generateChartAnalysis(
    chartTitle: string,
    chartType: string,
    dataDescription: string
  ): Promise<string> {
    const prompt = `Analyze this ${chartType} chart titled "${chartTitle}".

Data description: ${dataDescription}

Write a brief 1-2 paragraph analysis explaining:
1. What the chart shows
2. Key trends or patterns
3. Notable outliers or anomalies (if any)

Be concise and insight-driven.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate an AI image for the report
   */
  async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
  ): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: this.imageModel,
        prompt: `Professional business illustration: ${prompt}. Clean, modern, corporate style.`,
        n: 1,
        size,
        response_format: 'b64_json',
      });

      const imageData = response.data?.[0]?.b64_json;
      if (!imageData) {
        throw new Error('No image data returned');
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
    const styleDescriptions = {
      business: 'corporate, professional, clean lines, blue tones',
      research: 'academic, scientific, data visualization elements',
      technical: 'technology, engineering, circuit patterns, modern',
    };

    return `Abstract ${styleDescriptions[style]} illustration representing "${title}". 
No text in image. Suitable as report cover background.`;
  }

  /**
   * Get style-specific prompt instructions
   */
  private getStylePrompt(style: ReportStyle): string {
    const prompts = {
      business: `Write in a concise, executive-friendly tone. Focus on KPIs, trends, risks, and actionable recommendations. 
Lead with insights, put details in context. Use clear business language.`,

      research: `Write in a formal, structured academic tone. Include methodology considerations.
Be thorough in analysis, cite data points, discuss limitations. Use precise terminology.`,

      technical: `Write in a detailed, engineering-focused tone. Include system behaviors, metrics, and technical details.
Focus on performance data, error analysis, and root causes. Use technical terminology appropriately.`,
    };

    return prompts[style];
  }

  /**
   * Build data context string for LLM
   */
  private buildDataContext(
    dataProfile: DataProfile,
    parsedData: Record<string, unknown>[],
    textContent: string[]
  ): string {
    let context = '';

    // Data structure
    context += `Dataset: ${dataProfile.rowCount} rows, ${dataProfile.columnCount} columns\n`;
    context += `Data Quality Score: ${dataProfile.dataQualityScore}/100\n\n`;

    // Column summaries
    context += 'Columns:\n';
    for (const col of dataProfile.columns) {
      context += `- ${col.name} (${col.type}): `;
      if (col.type === 'numeric') {
        context += `min=${col.min}, max=${col.max}, mean=${col.mean?.toFixed(2)}\n`;
      } else if (col.topValues) {
        context += `top values: ${col.topValues.map(v => v.value).join(', ')}\n`;
      } else {
        context += `${col.uniqueCount} unique values\n`;
      }
    }

    // Sample data
    if (parsedData.length > 0) {
      context += '\nSample data (first 5 rows):\n';
      context += JSON.stringify(parsedData.slice(0, 5), null, 2);
    }

    // Text content
    if (textContent.length > 0) {
      context += '\n\nAdditional context:\n';
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
      executiveSummary: narrative.executiveSummary || 'Executive summary not available.',
      sections: (narrative.sections || []).map((section, index) => ({
        sectionId: section.sectionId || `section-${index + 1}`,
        sectionTitle: section.sectionTitle || `Section ${index + 1}`,
        content: section.content || '',
        order: section.order || index + 1,
      })),
      recommendations: narrative.recommendations || [],
      keyFindings: narrative.keyFindings || [],
    };
  }
}

export const openaiService = new OpenAIService();
