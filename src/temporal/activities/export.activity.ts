import { createModuleLogger } from '../../core/index.js';
import { docxGenerator, pdfGenerator, storage } from '../../services/index.js';
import type {
  Branding,
  DataProfile,
  GeneratedChart,
  GeneratedNarrative,
  OutputFormat,
  Report,
  ReportFile,
  ReportStatus,
  ReportStyle,
} from '../../shared/types/index.js';

const logger = createModuleLogger('export-activity');

// ============================================================================
// Activity: Export Formats
// ============================================================================

export interface ExportFormatsInput {
  reportId: string;
  html: string;
  outputFormats: OutputFormat[];
  title: string;
  style: ReportStyle;
  narrative: GeneratedNarrative;
  charts: GeneratedChart[];
  profile: DataProfile;
  branding?: Branding;
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
          const { size: pdfSize } = await pdfGenerator.generateFromHTML(
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

          const { size: docxSize } = await docxGenerator.generateReport(
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
  style: ReportStyle;
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
