import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';

import { config } from '../../core/index.js';

import { reportController } from './report.controller.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.report.maxUploadSizeMB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/json',
      'text/plain',
      'text/markdown',
      // Excel formats
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
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

// ============================================================================
// POST /reports - Create a new report
// ============================================================================
router.post(
  '/',
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
  (req: Request, res: Response) => reportController.create(req, res)
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

export default router;
