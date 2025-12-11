import { Context } from '@temporalio/activity';

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

  const activityCtx = Context.current();
  const heartbeat = setInterval(
    () =>
      activityCtx.heartbeat({
        step: 'exportFormats',
        reportId: input.reportId,
        completed: 0,
        total: input.outputFormats.length,
      }),
    5000
  );

  // Update status
  await storage.saveReport(input.reportId, { status: 'EXPORTING' });

  const files: ReportFile[] = [];

  try {
    for (const format of input.outputFormats) {
      try {
        // Pulse heartbeat with progress per iteration
        activityCtx.heartbeat({
          step: 'exportFormats',
          reportId: input.reportId,
          completed: files.length,
          total: input.outputFormats.length,
          format,
        });

        const file = await exportSingleFormat(format, input);
        if (file) {
          files.push(file);
          logger.info(`Exported ${format} for report: ${input.reportId}`);
        }
      } catch (error) {
        logger.error(`Failed to export ${format} for report: ${input.reportId}`, { error });
        throw error;
      }
    }

    return files;
  } finally {
    clearInterval(heartbeat);
  }
}

async function exportSingleFormat(
  format: OutputFormat,
  input: ExportFormatsInput
): Promise<ReportFile | null> {
  switch (format) {
    case 'HTML': {
      const htmlPath = await storage.getOutputFilePath(input.reportId, `${input.reportId}.html`);
      const htmlExists = await storage.fileExists(htmlPath);
      const htmlSize = htmlExists
        ? await storage.getFileSize(htmlPath)
        : (await storage.saveOutputFile(
            input.reportId,
            `${input.reportId}.html`,
            Buffer.from(input.html)
          ),
          await storage.getFileSize(htmlPath));

      if (!htmlExists) {
        logger.warn(`Expected HTML file missing, stored fallback: ${htmlPath}`);
      }

      return {
        format: 'HTML',
        url: `/reports/${input.reportId}/files?format=HTML`,
        size: htmlSize,
        generatedAt: new Date().toISOString(),
      };
    }

    case 'PDF': {
      const pdfPath = await storage.getOutputFilePath(input.reportId, `${input.reportId}.pdf`);
      const pdfExists = await storage.fileExists(pdfPath);
      const pdfSize = pdfExists
        ? await storage.getFileSize(pdfPath)
        : (await pdfGenerator.generateFromHTML(input.html, input.reportId, `${input.reportId}.pdf`))
            .size;

      return {
        format: 'PDF',
        url: `/reports/${input.reportId}/files?format=PDF`,
        size: pdfSize,
        generatedAt: new Date().toISOString(),
      };
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

      const docxPath = await storage.getOutputFilePath(input.reportId, `${input.reportId}.docx`);
      const docxExists = await storage.fileExists(docxPath);
      const docxSize = docxExists
        ? await storage.getFileSize(docxPath)
        : (
            await docxGenerator.generateReport(
              report,
              input.narrative,
              input.charts,
              input.profile,
              input.branding
            )
          ).size;

      return {
        format: 'DOCX',
        url: `/reports/${input.reportId}/files?format=DOCX`,
        size: docxSize,
        generatedAt: new Date().toISOString(),
      };
    }

    default:
      logger.warn(`Unsupported format: ${format}`);
      return null;
  }
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
