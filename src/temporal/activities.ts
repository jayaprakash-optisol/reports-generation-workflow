import { dataProfiler } from '../services/data-profiler.js';
import { openaiService } from '../services/openai-service.js';
import { chartGenerator } from '../services/chart-generator.js';
import { htmlGenerator } from '../templates/html-generator.js';
import { pdfGenerator } from '../services/pdf-generator.js';
import { docxGenerator } from '../services/docx-generator.js';
import { storage } from '../utils/storage.js';
import { createModuleLogger } from '../utils/logger.js';
import {
  InputData,
  ReportConfig,
  DataProfile,
  GeneratedNarrative,
  GeneratedChart,
  Report,
  ReportFile,
  OutputFormat,
  ReportStatus,
} from '../types/index.js';

const logger = createModuleLogger('activities');

// ============================================================================
// Activity: Profile Data
// ============================================================================

export interface ProfileDataInput {
  reportId: string;
  inputData: InputData[];
}

export interface ProfileDataOutput {
  profile: DataProfile;
  parsedData: Record<string, unknown>[];
  textContent: string[];
}

export async function profileData(input: ProfileDataInput): Promise<ProfileDataOutput> {
  logger.info(`Profiling data for report: ${input.reportId}`);

  const { profile, parsedData, textContent } = await dataProfiler.profileData(input.inputData);

  // Store intermediate result
  await storage.saveReport(input.reportId, {
    status: 'DATA_PROFILING',
    dataProfile: profile,
  });

  logger.info(`Data profiling complete: ${profile.rowCount} rows, ${profile.columnCount} columns`);

  return { profile, parsedData, textContent };
}

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
  style: 'business' | 'research' | 'technical';
  narrative: GeneratedNarrative;
  charts: GeneratedChart[];
  profile: DataProfile;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    companyName?: string;
  };
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

// ============================================================================
// Activity: Export Formats
// ============================================================================

export interface ExportFormatsInput {
  reportId: string;
  html: string;
  outputFormats: OutputFormat[];
  title: string;
  style: 'business' | 'research' | 'technical';
  narrative: GeneratedNarrative;
  charts: GeneratedChart[];
  profile: DataProfile;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    companyName?: string;
  };
}

export async function exportFormats(input: ExportFormatsInput): Promise<ReportFile[]> {
  logger.info(`Exporting formats for report: ${input.reportId}`);

  // Update status
  await storage.saveReport(input.reportId, { status: 'EXPORTING' });

  const files: ReportFile[] = [];

  for (const format of input.outputFormats) {
    try {
      let file: ReportFile;

      switch (format) {
        case 'HTML': {
          const htmlPath = await storage.getOutputFilePath(
            input.reportId,
            `${input.reportId}.html`
          );
          const htmlSize = await storage.getFileSize(htmlPath);
          file = {
            format: 'HTML',
            url: `/reports/${input.reportId}/files?format=HTML`,
            size: htmlSize,
            generatedAt: new Date().toISOString(),
          };
          break;
        }

        case 'PDF': {
          const { path: pdfPath, size: pdfSize } = await pdfGenerator.generateFromHTML(
            input.html,
            input.reportId,
            `${input.reportId}.pdf`
          );
          file = {
            format: 'PDF',
            url: `/reports/${input.reportId}/files?format=PDF`,
            size: pdfSize,
            generatedAt: new Date().toISOString(),
          };
          break;
        }

        case 'DOCX': {
          const report: Report = {
            id: input.reportId,
            title: input.title,
            style: input.style,
            status: 'EXPORTING' as ReportStatus,
            outputFormats: input.outputFormats,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const { path: docxPath, size: docxSize } = await docxGenerator.generateReport(
            report,
            input.narrative,
            input.charts,
            input.profile,
            input.branding
          );
          file = {
            format: 'DOCX',
            url: `/reports/${input.reportId}/files?format=DOCX`,
            size: docxSize,
            generatedAt: new Date().toISOString(),
          };
          break;
        }

        default:
          logger.warn(`Unsupported format: ${format}`);
          continue;
      }

      files.push(file);
      logger.info(`Exported ${format} for report: ${input.reportId}`);
    } catch (error) {
      logger.error(`Failed to export ${format} for report: ${input.reportId}`, { error });
      throw error;
    }
  }

  return files;
}

// ============================================================================
// Activity: Finalize Report
// ============================================================================

export interface FinalizeReportInput {
  reportId: string;
  title: string;
  style: 'business' | 'research' | 'technical';
  outputFormats: OutputFormat[];
  files: ReportFile[];
  profile: DataProfile;
}

export async function finalizeReport(input: FinalizeReportInput): Promise<Report> {
  logger.info(`Finalizing report: ${input.reportId}`);

  const report: Report = {
    id: input.reportId,
    title: input.title,
    style: input.style,
    status: 'COMPLETED',
    outputFormats: input.outputFormats,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    files: input.files,
    dataProfile: input.profile,
  };

  await storage.saveReport(input.reportId, report);

  logger.info(`Report finalized: ${input.reportId}`);

  return report;
}

// ============================================================================
// Activity: Update Report Status
// ============================================================================

export interface UpdateStatusInput {
  reportId: string;
  status: ReportStatus;
  progress?: number;
  currentStep?: string;
  errorMessage?: string;
}

export async function updateReportStatus(input: UpdateStatusInput): Promise<void> {
  logger.info(`Updating status for report: ${input.reportId} to ${input.status}`);

  const existing = (await storage.getReport(input.reportId)) as Record<string, unknown> | null;

  await storage.saveReport(input.reportId, {
    ...existing,
    status: input.status,
    progress: input.progress,
    currentStep: input.currentStep,
    errorMessage: input.errorMessage,
    updatedAt: new Date().toISOString(),
  });
}

// Export all activities
export const activities = {
  profileData,
  generateInsights,
  generateCharts,
  renderLayout,
  exportFormats,
  finalizeReport,
  updateReportStatus,
};
