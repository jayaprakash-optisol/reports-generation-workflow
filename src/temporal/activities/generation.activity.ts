import { createModuleLogger } from '../../core/index.js';
import { chartGenerator, htmlGenerator, openaiService, storage } from '../../services/index.js';
import type {
  Branding,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  Report,
  ReportConfig,
  ReportStatus,
  ReportStyle,
} from '../../shared/types/index.js';

const logger = createModuleLogger('generation-activity');

// ============================================================================
// Activity: Generate Insights
// ============================================================================

export interface GenerateInsightsInput {
  reportId: string;
  profile: DataProfile;
  parsedData: Record<string, unknown>[];
  textContent: string[];
  config: ReportConfig;
}

export async function generateInsights(input: GenerateInsightsInput): Promise<GeneratedNarrative> {
  logger.info(`Generating insights for report: ${input.reportId}`);

  // Update status
  await storage.saveReport(input.reportId, { status: 'INSIGHT_GENERATION' });

  const narrative = await openaiService.generateNarrative(
    input.profile,
    input.parsedData,
    input.textContent,
    input.config.style,
    input.config.title,
    input.config.customPromptInstructions
  );

  logger.info(`Generated ${narrative.sections.length} sections for report: ${input.reportId}`);

  return narrative;
}

// ============================================================================
// Activity: Generate Charts
// ============================================================================

export interface GenerateChartsInput {
  reportId: string;
  profile: DataProfile;
  parsedData: Record<string, unknown>[];
}

export async function generateCharts(input: GenerateChartsInput): Promise<GeneratedChart[]> {
  logger.info(`Generating charts for report: ${input.reportId}`);

  // Update status
  await storage.saveReport(input.reportId, { status: 'CHART_GENERATION' });

  const charts = await chartGenerator.generateCharts(
    input.profile.suggestedCharts,
    input.parsedData,
    input.reportId,
    input.profile
  );

  logger.info(`Generated ${charts.length} charts for report: ${input.reportId}`);

  return charts;
}

// ============================================================================
// Activity: Render Layout (Generate HTML)
// ============================================================================

export interface RenderLayoutInput {
  reportId: string;
  title: string;
  style: ReportStyle;
  narrative: GeneratedNarrative;
  charts: GeneratedChart[];
  profile: DataProfile;
  branding?: Branding;
}

export async function renderLayout(input: RenderLayoutInput): Promise<string> {
  logger.info(`Rendering layout for report: ${input.reportId}`);

  // Update status
  await storage.saveReport(input.reportId, { status: 'LAYOUT_RENDERING' });

  const report: Report = {
    id: input.reportId,
    title: input.title,
    style: input.style,
    status: 'LAYOUT_RENDERING' as ReportStatus,
    outputFormats: ['HTML'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const html = htmlGenerator.generateReport(
    report,
    input.narrative,
    input.charts,
    input.profile,
    input.branding
  );

  // Save HTML
  const filename = `${input.reportId}.html`;
  await storage.saveOutputFile(input.reportId, filename, Buffer.from(html));

  logger.info(`Layout rendered for report: ${input.reportId}`);

  return html;
}

