import type { Request, Response } from 'express';

import { config, createModuleLogger } from '../../core/index.js';
import { storage } from '../../services/index.js';
import type { InputData, OutputFormat, Report, ReportConfig } from '../../shared/types/index.js';
import { CreateReportRequestSchema } from '../../shared/types/index.js';
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
      const { reportId, workflowId } = await startReportGeneration(
        data as InputData[],
        reportConfig as ReportConfig
      );

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

      // Convert uploaded files to InputData
      const inputData: InputData[] = files.map(file => {
        const content = file.buffer.toString('utf-8');
        const isJson = file.mimetype === 'application/json';
        const isCsv = file.mimetype === 'text/csv';

        if (isJson || isCsv) {
          return {
            type: 'structured' as const,
            format: isJson ? ('json' as const) : ('csv' as const),
            data: content,
          };
        } else {
          return {
            type: 'unstructured' as const,
            format: file.mimetype.includes('markdown') ? ('markdown' as const) : ('text' as const),
            content,
          };
        }
      });

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
}

// Export singleton instance
export const reportController = new ReportController();
