import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';

import { config } from '../config/index.js';
import {
  cancelWorkflow,
  getWorkflowInfo,
  getWorkflowStatus,
  startReportGeneration,
  waitForWorkflowResult,
} from '../temporal/client.js';
import type { InputData, OutputFormat, Report, ReportConfig } from '../types/index.js';
import { CreateReportRequestSchema } from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';

const logger = createModuleLogger('api-routes');
const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.report.maxUploadSizeMB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['text/csv', 'application/json', 'text/plain', 'text/markdown'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// ============================================================================
// POST /reports - Create a new report
// ============================================================================
router.post(
  '/reports',
  [
    body('data').isArray({ min: 1 }).withMessage('Data array is required'),
    body('config.title').isString().trim().isLength({ min: 1, max: 200 }),
    body('config.style').optional().isIn(['business', 'research', 'technical']),
    body('config.outputFormats')
      .optional()
      .isArray()
      .custom((value: string[]) => value.every(v => ['PDF', 'DOCX', 'HTML'].includes(v))),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const parseResult = CreateReportRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
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
);

// ============================================================================
// POST /reports/upload - Create report from file upload
// ============================================================================
router.post(
  '/reports/upload',
  upload.array('files', 5),
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('style').optional().isIn(['business', 'research', 'technical']),
    body('outputFormats').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
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
);

// ============================================================================
// GET /reports/:reportId - Get report status
// ============================================================================
router.get(
  '/reports/:reportId',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const workflowId = `report-${reportId}`;

      // Get report from storage
      const storedReport = (await storage.getReport(reportId)) as Report | null;

      // Get workflow status
      const workflowStatus = await getWorkflowStatus(workflowId);
      const workflowInfo = await getWorkflowInfo(workflowId);

      if (!storedReport && !workflowInfo) {
        return res.status(404).json({ error: 'Report not found' });
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
);

// ============================================================================
// GET /reports/:reportId/files - Download report file
// ============================================================================
router.get(
  '/reports/:reportId/files',
  [
    param('reportId').isString().trim().isLength({ min: 1 }),
    query('format').isIn(['PDF', 'DOCX', 'HTML']),
  ],
  validate,
  async (req: Request, res: Response) => {
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
        return res.status(404).json({ error: 'File not found' });
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
);

// ============================================================================
// GET /reports - List all reports
// ============================================================================
router.get('/reports', async (_req: Request, res: Response) => {
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
});

// ============================================================================
// POST /reports/:reportId/cancel - Cancel report generation
// ============================================================================
router.post(
  '/reports/:reportId/cancel',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
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
);

// ============================================================================
// GET /reports/:reportId/wait - Wait for report completion
// ============================================================================
router.get(
  '/reports/:reportId/wait',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  async (req: Request, res: Response) => {
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
);

// ============================================================================
// Health check endpoint
// ============================================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
