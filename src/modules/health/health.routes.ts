import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

/**
 * GET /health - Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;

