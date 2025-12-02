import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundleWorkflowCode, NativeConnection, Worker } from '@temporalio/worker';

import { config, createModuleLogger } from '../core/index.js';
import { storage } from '../services/index.js';

import * as activities from './activities/index.js';

const logger = createModuleLogger('temporal-worker');
// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

async function run() {
  logger.info('Starting Temporal worker...');

  // Initialize storage
  await storage.initialize();

  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: config.temporal.address,
  });

  // Bundle workflows from TypeScript source
  logger.info('Bundling workflows...');
  const workflowBundle = await bundleWorkflowCode({
    workflowsPath: path.resolve(__dirname, './workflows/report-generation.workflow.ts'),
  });

  // Create worker
  const worker = await Worker.create({
    connection,
    namespace: config.temporal.namespace,
    taskQueue: config.temporal.taskQueue,
    workflowBundle,
    activities,
    maxConcurrentWorkflowTaskExecutions: 10,
    maxConcurrentActivityTaskExecutions: 20,
  });

  logger.info(`Worker connected to Temporal at ${config.temporal.address}`);
  logger.info(`Task queue: ${config.temporal.taskQueue}`);

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down worker...');
    worker.shutdown();
    await connection.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Start the worker
  await worker.run();
}

run().catch(err => {
  logger.error('Worker failed to start', { error: err });
  process.exit(1);
});
