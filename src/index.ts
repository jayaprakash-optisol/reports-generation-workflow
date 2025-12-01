import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { createModuleLogger } from './utils/logger.js';
import { storage } from './utils/storage.js';
import routes from './api/routes.js';

const logger = createModuleLogger('server');

async function main() {
  // Initialize storage
  await storage.initialize();
  logger.info('Storage initialized');

  // Create Express app
  const app = express();

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
  }));
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.method === 'POST' ? '...' : undefined,
    });
    next();
  });

  // API routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'AI Report Generator',
      version: '1.0.0',
      description: 'AI-powered report generation with Temporal workflows',
      endpoints: {
        health: 'GET /api/health',
        createReport: 'POST /api/reports',
        uploadReport: 'POST /api/reports/upload',
        getReport: 'GET /api/reports/:reportId',
        listReports: 'GET /api/reports',
        downloadFile: 'GET /api/reports/:reportId/files?format=PDF|DOCX|HTML',
        cancelReport: 'POST /api/reports/:reportId/cancel',
        waitForReport: 'GET /api/reports/:reportId/wait',
      },
      documentation: 'See README.md for full API documentation',
    });
  });

  // Error handling
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
      error: 'Internal server error',
      message: config.server.isDev ? err.message : 'An unexpected error occurred',
    });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Start server
  const server = app.listen(config.server.port, () => {
    logger.info(`🚀 Server running on http://localhost:${config.server.port}`);
    logger.info(`📊 Environment: ${config.server.nodeEnv}`);
    logger.info(`📁 Storage path: ${config.storage.basePath}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});

