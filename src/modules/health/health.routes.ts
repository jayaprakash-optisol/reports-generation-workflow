import type { Request, Response } from 'express';
import { Router } from 'express';

import { config, createModuleLogger } from '../../core/index.js';
import { storage } from '../../services/index.js';
import { getTemporalClient } from '../../temporal/client.js';

const router = Router();
const logger = createModuleLogger('health');

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    api: { status: 'healthy' | 'unhealthy'; responseTime?: number };
    storage: { status: 'healthy' | 'unhealthy'; type: string; error?: string };
    temporal: { status: 'healthy' | 'unhealthy'; address: string; error?: string };
    redis?: { status: 'healthy' | 'unhealthy'; error?: string };
  };
}

/**
 * GET /health - Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Check storage health
 */
async function checkStorageHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  type: string;
  error?: string;
}> {
  try {
    await storage.initialize();
    const testKey = `health-check-${Date.now()}`;
    await storage.saveReport(testKey, { test: true });
    const retrieved = await storage.getReport(testKey);

    if (retrieved) {
      return { status: 'healthy', type: config.storage.type };
    }
    return {
      status: 'unhealthy',
      type: config.storage.type,
      error: 'Failed to retrieve test data',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      type: config.storage.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Temporal health
 */
async function checkTemporalHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  address: string;
  error?: string;
}> {
  try {
    const client = await getTemporalClient();
    // Try to describe a non-existent workflow to test connection
    await client.workflow
      .getHandle('health-check-test')
      .describe()
      .catch(() => {
        // Expected to fail, but connection should work
      });
    return { status: 'healthy', address: config.temporal.address };
  } catch (error) {
    return {
      status: 'unhealthy',
      address: config.temporal.address,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth(): Promise<
  { status: 'healthy' | 'unhealthy'; error?: string } | undefined
> {
  try {
    const { cacheService } = await import('../../services/cache/cache.service.js');
    const testKey = `health-check-${Date.now()}`;
    await cacheService.set(testKey, { test: true }, 10);
    const exists = await cacheService.exists(testKey);

    if (exists) {
      return { status: 'healthy' };
    }
    return { status: 'unhealthy', error: 'Cache test failed' };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * GET /health/detailed - Detailed health check with all dependencies
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      api: { status: 'healthy', responseTime: 0 },
      storage: { status: 'unhealthy', type: config.storage.type },
      temporal: { status: 'unhealthy', address: config.temporal.address },
    },
  };

  // Check API response time
  health.checks.api.responseTime = Date.now() - startTime;

  // Check Storage
  health.checks.storage = await checkStorageHealth();
  if (health.checks.storage.status === 'unhealthy') {
    health.status = 'degraded';
  }

  // Check Temporal
  health.checks.temporal = await checkTemporalHealth();
  if (health.checks.temporal.status === 'unhealthy') {
    health.status = 'unhealthy';
  }

  // Check Redis
  const redisCheck = await checkRedisHealth();
  if (redisCheck) {
    health.checks.redis = redisCheck;
    if (redisCheck.status === 'unhealthy' && health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  // Determine overall status
  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  if (!allHealthy && health.status === 'healthy') {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ready - Readiness probe (for Kubernetes)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await storage.initialize();
    await getTemporalClient();

    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/live - Liveness probe (for Kubernetes)
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

export default router;
