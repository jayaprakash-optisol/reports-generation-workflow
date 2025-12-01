import { Worker, NativeConnection, bundleWorkflowCode } from '@temporalio/worker';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';
import * as activities from './activities.js';

const logger = createModuleLogger('temporal-worker');
const __filename = fileURLToPath(import.meta.url);
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
    workflowsPath: path.resolve(__dirname, './workflows.ts'),
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
    await worker.shutdown();
    await connection.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the worker
  await worker.run();
}

run().catch(err => {
  logger.error('Worker failed to start', { error: err });
  process.exit(1);
});

