import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import type { z } from 'zod';

import { config } from '../../core/index.js';
import { BatchReportRequestSchema, CreateReportRequestSchema } from '../../shared/types/index.js';

import { reportController } from './report.controller.js';

const router = Router();

// Configure multer for file uploads
// Increased limit for large files that will be processed by docling
const maxFileSizeMB = Math.max(config.report.maxUploadSizeMB, 100); // At least 100MB for docling processing

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024,
    files: 10, // Allow more files
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      // Structured data formats
      'text/csv',
      'application/json',
      'text/plain',
      'text/markdown',
      // Excel formats
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      // Document formats for docling processing
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      // Additional text formats
      'text/html',
      'application/rtf',
      // Image formats
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
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

// Zod validation middleware
const validateZod = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
};

// ============================================================================
// POST /reports - Create a new report
// ============================================================================
router.post('/', validateZod(CreateReportRequestSchema), (req: Request, res: Response) =>
  reportController.create(req, res)
);

// ============================================================================
// POST /reports/batch - Create multiple reports in batch
// ============================================================================
router.post('/batch', validateZod(BatchReportRequestSchema), (req: Request, res: Response) =>
  reportController.createBatch(req, res)
);

// ============================================================================
// POST /reports/upload - Create report from file upload
// ============================================================================
router.post(
  '/upload',
  upload.array('files', 5),
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }),
    body('style').optional().isIn(['business', 'research', 'technical']),
    body('outputFormats').optional().isString(),
  ],
  validate,
  (req: Request, res: Response) => reportController.createFromUpload(req, res)
);

// ============================================================================
// GET /reports - List all reports
// ============================================================================
router.get('/', (req: Request, res: Response) => reportController.list(req, res));

// ============================================================================
// GET /reports/:reportId - Get report status
// ============================================================================
router.get(
  '/:reportId',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  (req: Request, res: Response) => reportController.getById(req, res)
);

// ============================================================================
// GET /reports/:reportId/files - Download report file
// ============================================================================
router.get(
  '/:reportId/files',
  [
    param('reportId').isString().trim().isLength({ min: 1 }),
    query('format').isIn(['PDF', 'DOCX', 'HTML']),
  ],
  validate,
  (req: Request, res: Response) => reportController.downloadFile(req, res)
);

// ============================================================================
// POST /reports/:reportId/cancel - Cancel report generation
// ============================================================================
router.post(
  '/:reportId/cancel',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  (req: Request, res: Response) => reportController.cancel(req, res)
);

// ============================================================================
// GET /reports/:reportId/wait - Wait for report completion
// ============================================================================
router.get(
  '/:reportId/wait',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  (req: Request, res: Response) => reportController.waitForCompletion(req, res)
);

// ============================================================================
// GET /reports/:reportId/costs - Get cost metrics for a report
// ============================================================================
router.get(
  '/:reportId/costs',
  [param('reportId').isString().trim().isLength({ min: 1 })],
  validate,
  (req: Request, res: Response) => reportController.getCosts(req, res)
);

// ============================================================================
// GET /reports/costs/aggregated - Get aggregated costs across all reports
// ============================================================================
router.get('/costs/aggregated', (req: Request, res: Response) =>
  reportController.getAggregatedCosts(req, res)
);

// ============================================================================
// GET /reports/files/:fileId/status - Get file processing status
// ============================================================================
router.get(
  '/files/:fileId/status',
  [param('fileId').isString().trim().isLength({ min: 1 })],
  validate,
  (req: Request, res: Response) => reportController.getFileProcessingStatus(req, res)
);

export default router;
