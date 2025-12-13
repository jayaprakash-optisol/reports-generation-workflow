import type { Request, Response } from 'express';
import { nanoid } from 'nanoid';

import { config, createModuleLogger } from '../../core/index.js';
import { doclingService, storage } from '../../services/index.js';
import type { InputData, OutputFormat, Report, ReportConfig } from '../../shared/types/index.js';
import { BatchReportRequestSchema, CreateReportRequestSchema } from '../../shared/types/index.js';
import {
  cancelWorkflow,
  getWorkflowInfo,
  getWorkflowStatus,
  startReportGeneration,
  waitForWorkflowResult,
} from '../../temporal/client.js';

const logger = createModuleLogger('report-controller');

/**
 * Report Controller - handles all report-related request logic
 */
export class ReportController {
  /**
   * Create a new report from JSON data
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body with Zod
      const parseResult = CreateReportRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
        return;
      }

      const { data, config: reportConfig } = parseResult.data;

      // Start the workflow
      const { reportId, workflowId } = await startReportGeneration(data, reportConfig);

      logger.info(`Report generation started: ${reportId}`);

      res.status(202).json({
        reportId,
        workflowId,
        status: 'QUEUED',
        statusUrl: `/reports/${reportId}`,
        message: 'Report generation started',
      });
    } catch (error) {
      logger.error('Failed to create report', { error });
      res.status(500).json({
        error: 'Failed to start report generation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a report from file upload
   */
  async createFromUpload(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      const chunkSizeBytes = config.docling.chunkSizeMB * 1024 * 1024;
      const useDocling = await doclingService.isAvailable();

      // Process files - use docling for large files or document formats
      const inputDataPromises = files.map(async (file, index) => {
        const fileSize = file.buffer.length;
        const fileId = `${nanoid(12)}-${index}`;

        // Check if file is a document format that needs docling processing
        const isDocumentFormat =
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'application/msword' ||
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.mimetype === 'application/vnd.ms-powerpoint' ||
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          file.mimetype === 'application/rtf';

        // Check if file is an image
        const isImage = file.mimetype.startsWith('image/');

        const shouldUseDocling = useDocling && (fileSize > chunkSizeBytes || isDocumentFormat);

        // Initialize processing status for tracking
        if (shouldUseDocling) {
          doclingService.initializeProcessingStatus(fileId, file.originalname);
        }

        if (shouldUseDocling) {
          logger.info(
            `Processing file with docling: ${file.originalname} (${fileSize} bytes, format: ${file.mimetype})`
          );

          // Process file through docling
          const result = await doclingService.processFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            fileId
          );

          if (!result.success || !result.chunks || result.chunks.length === 0) {
            logger.warn(
              `Docling processing failed for ${file.originalname}, falling back to direct processing`
            );
            // Fallback to direct processing
            return this.convertFileToInputData(file);
          }

          // Convert docling chunks to InputData
          // Combine all chunks into a single text content
          const combinedContent = result.chunks.map(chunk => chunk.content).join('\n\n');

          return {
            type: 'unstructured' as const,
            format: 'text' as const,
            content: combinedContent,
          };
        } else if (isImage) {
          // For images, encode as base64 and include as unstructured content
          const base64Image = file.buffer.toString('base64');
          const dataUri = `data:${file.mimetype};base64,${base64Image}`;
          return {
            type: 'unstructured' as const,
            format: 'text' as const,
            content: `[Image: ${file.originalname}]\n${dataUri}`,
          };
        } else {
          // Process small files directly
          return this.convertFileToInputData(file);
        }
      });

      // Wait for all files to be processed
      const inputData = await Promise.all(inputDataPromises);

      // Parse output formats
      let outputFormats: OutputFormat[] = ['PDF'];
      if (req.body.outputFormats) {
        try {
          outputFormats = JSON.parse(req.body.outputFormats);
        } catch {
          outputFormats = req.body.outputFormats
            .split(',')
            .map((f: string) => f.trim().toUpperCase()) as OutputFormat[];
        }
      }

      const reportConfig: ReportConfig = {
        title: req.body.title,
        style: req.body.style ?? config.report.defaultStyle,
        outputFormats,
        branding: req.body.branding ? JSON.parse(req.body.branding) : undefined,
      };

      // Start the workflow
      const { reportId, workflowId } = await startReportGeneration(inputData, reportConfig);

      logger.info(`Report generation started from upload: ${reportId}`);

      res.status(202).json({
        reportId,
        workflowId,
        status: 'QUEUED',
        statusUrl: `/reports/${reportId}`,
        filesProcessed: files.length,
        message: 'Report generation started',
      });
    } catch (error) {
      logger.error('Failed to create report from upload', { error });
      res.status(500).json({
        error: 'Failed to start report generation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Convert a file to InputData format (for small files processed directly)
   */
  private convertFileToInputData(file: Express.Multer.File): InputData {
    const isJson = file.mimetype === 'application/json';
    const isCsv = file.mimetype === 'text/csv';
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel';

    if (isExcel) {
      // Excel files are binary - encode as base64
      return {
        type: 'structured' as const,
        format: 'xlsx' as const,
        data: file.buffer.toString('base64'),
      };
    } else if (isJson || isCsv) {
      const content = file.buffer.toString('utf-8');
      return {
        type: 'structured' as const,
        format: isJson ? ('json' as const) : ('csv' as const),
        data: content,
      };
    } else {
      const content = file.buffer.toString('utf-8');
      return {
        type: 'unstructured' as const,
        format: file.mimetype.includes('markdown') ? ('markdown' as const) : ('text' as const),
        content,
      };
    }
  }

  /**
   * Get report status by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const workflowId = `report-${reportId}`;

      // Get report from storage
      const storedReport = (await storage.getReport(reportId)) as Report | null;

      // Get workflow status
      const workflowStatus = await getWorkflowStatus(workflowId);
      const workflowInfo = await getWorkflowInfo(workflowId);

      if (!storedReport && !workflowInfo) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      const response = {
        ...storedReport,
        workflow: workflowStatus
          ? {
              status: workflowStatus.status,
              progress: workflowStatus.progress,
              currentStep: workflowStatus.currentStep,
              error: workflowStatus.error,
            }
          : undefined,
        execution: workflowInfo
          ? {
              status: workflowInfo.status,
              startTime: workflowInfo.startTime,
              closeTime: workflowInfo.closeTime,
            }
          : undefined,
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get report status', { error });
      res.status(500).json({
        error: 'Failed to get report status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Download report file
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const format = req.query.format as OutputFormat;

      const extensionMap: Record<OutputFormat, string> = {
        PDF: 'pdf',
        DOCX: 'docx',
        HTML: 'html',
      };

      const filename = `${reportId}.${extensionMap[format]}`;
      const fileBuffer = await storage.getOutputFile(reportId, filename);

      if (!fileBuffer) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const contentTypeMap: Record<OutputFormat, string> = {
        PDF: 'application/pdf',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        HTML: 'text/html',
      };

      res.setHeader('Content-Type', contentTypeMap[format]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (error) {
      logger.error('Failed to download report file', { error });
      res.status(500).json({
        error: 'Failed to download file',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List all reports
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const reportIds = await storage.listReports();

      const reports = await Promise.all(
        reportIds.map(async id => {
          const report = (await storage.getReport(id)) as Report | null;
          if (!report) return null;

          // For active workflows, query Temporal to get live status
          if (report.status && !['COMPLETED', 'FAILED'].includes(report.status)) {
            const workflowId = `report-${id}`;
            try {
              const workflowStatus = await getWorkflowStatus(workflowId);
              if (workflowStatus) {
                // Merge live status from Temporal with storage data
                return {
                  ...report,
                  status: workflowStatus.status,
                  progress: workflowStatus.progress,
                };
              }
            } catch (error) {
              // If workflow query fails, continue with storage data
              logger.debug(`Could not query workflow status for ${workflowId}`, { error });
            }
          }

          return report;
        })
      );

      const validReports = reports.filter(Boolean);

      res.json({
        count: validReports.length,
        reports: validReports,
      });
    } catch (error) {
      logger.error('Failed to list reports', { error });
      res.status(500).json({
        error: 'Failed to list reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cancel report generation
   */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const workflowId = `report-${reportId}`;

      const cancelled = await cancelWorkflow(workflowId);

      if (cancelled) {
        res.json({ message: 'Cancellation signal sent', reportId });
      } else {
        res.status(400).json({ error: 'Failed to cancel workflow' });
      }
    } catch (error) {
      logger.error('Failed to cancel report', { error });
      res.status(500).json({
        error: 'Failed to cancel report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Wait for report completion
   */
  async waitForCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const workflowId = `report-${reportId}`;

      const result = await waitForWorkflowResult(workflowId);

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Workflow not found or failed' });
      }
    } catch (error) {
      logger.error('Failed to wait for report', { error });
      res.status(500).json({
        error: 'Failed to wait for report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create multiple reports in batch
   */
  async createBatch(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body with Zod
      const parseResult = BatchReportRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
        return;
      }

      const { requests } = parseResult.data;

      // Start all workflows
      const results = await Promise.allSettled(
        requests.map(async request => {
          const { reportId, workflowId } = await startReportGeneration(
            request.data,
            request.config
          );
          return { reportId, workflowId, title: request.config.title };
        })
      );

      const successful = results
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<{ reportId: string; workflowId: string; title: string }> =>
            r.status === 'fulfilled'
        )
        .map(r => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r, index) => ({
          index,
          error: r.reason instanceof Error ? r.reason.message : 'Unknown error',
        }));

      logger.info(`Batch report generation: ${successful.length} started, ${failed.length} failed`);

      res.status(202).json({
        batchId: nanoid(12),
        total: requests.length,
        successful: successful.length,
        failed: failed.length,
        reports: successful,
        errors: failed.length > 0 ? failed : undefined,
      });
    } catch (error) {
      logger.error('Failed to create batch reports', { error });
      res.status(500).json({
        error: 'Failed to start batch report generation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cost metrics for a report
   */
  async getCosts(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { costTracker } = await import('../../services/index.js');
      const metrics = await costTracker.getCostMetrics(reportId);

      if (!metrics) {
        res.status(404).json({ error: 'Cost metrics not found for this report' });
        return;
      }

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get cost metrics', { error });
      res.status(500).json({
        error: 'Failed to get cost metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get aggregated costs across all reports
   */
  async getAggregatedCosts(_req: Request, res: Response): Promise<void> {
    try {
      const { costTracker } = await import('../../services/index.js');
      const aggregated = await costTracker.getAggregatedCosts();
      res.json(aggregated);
    } catch (error) {
      logger.error('Failed to get aggregated costs', { error });
      res.status(500).json({
        error: 'Failed to get aggregated costs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get file processing status
   */
  async getFileProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const status = doclingService.getProcessingStatus(fileId);

      if (!status) {
        res.status(404).json({ error: 'File processing status not found' });
        return;
      }

      res.json(status);
    } catch (error) {
      logger.error('Failed to get file processing status', { error });
      res.status(500).json({
        error: 'Failed to get file processing status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const reportController = new ReportController();
