import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { nanoid } from 'nanoid';

import { config, createModuleLogger } from '../core/index.js';
import type { InputData, ReportConfig, ReportStatus } from '../shared/types/index.js';

import type {
  ReportGenerationWorkflowInput,
  ReportGenerationWorkflowOutput,
} from './workflows/index.js';
import { cancelWorkflowSignal, getProgressQuery, getStatusQuery } from './workflows/index.js';

const logger = createModuleLogger('temporal-client');

let clientInstance: Client | null = null;

/**
 * Get or create Temporal client
 */
export async function getTemporalClient(): Promise<Client> {
  if (!clientInstance) {
    const connection = await Connection.connect({
      address: config.temporal.address,
    });

    clientInstance = new Client({
      connection,
      namespace: config.temporal.namespace,
    });

    logger.info(`Connected to Temporal at ${config.temporal.address}`);
  }

  return clientInstance;
}

/**
 * Start a report generation workflow
 */
export async function startReportGeneration(
  inputData: InputData[],
  reportConfig: ReportConfig
): Promise<{ reportId: string; workflowId: string }> {
  const client = await getTemporalClient();
  const reportId = nanoid(12);
  const workflowId = `report-${reportId}`;

  const input: ReportGenerationWorkflowInput = {
    reportId,
    inputData,
    config: reportConfig,
  };

  try {
    await client.workflow.start('reportGenerationWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId,
      args: [input],
      // Set a reasonable timeout for the entire workflow
      workflowExecutionTimeout: '30 minutes',
    });

    logger.info(`Started workflow: ${workflowId}`);

    return { reportId, workflowId };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      logger.warn(`Workflow already started: ${workflowId}`);
      return { reportId, workflowId };
    }
    throw error;
  }
}

/**
 * Get workflow status
 */
export async function getWorkflowStatus(workflowId: string): Promise<{
  status: ReportStatus;
  progress: number;
  currentStep: string;
  error?: string;
} | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const status = await handle.query(getStatusQuery);
    return status;
  } catch (error) {
    logger.error(`Failed to get workflow status: ${workflowId}`, { error });
    return null;
  }
}

/**
 * Get workflow progress
 */
export async function getWorkflowProgress(workflowId: string): Promise<number | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const progress = await handle.query(getProgressQuery);
    return progress;
  } catch (error) {
    logger.error(`Failed to get workflow progress: ${workflowId}`, { error });
    return null;
  }
}

/**
 * Cancel a workflow
 */
export async function cancelWorkflow(workflowId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(cancelWorkflowSignal);
    logger.info(`Sent cancel signal to workflow: ${workflowId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to cancel workflow: ${workflowId}`, { error });
    return false;
  }
}

/**
 * Wait for workflow to complete
 */
export async function waitForWorkflowResult(
  workflowId: string
): Promise<ReportGenerationWorkflowOutput | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const result = await handle.result();
    return result as ReportGenerationWorkflowOutput;
  } catch (error) {
    logger.error(`Failed to get workflow result: ${workflowId}`, { error });
    return null;
  }
}

/**
 * Get workflow execution info
 */
export async function getWorkflowInfo(workflowId: string): Promise<{
  status: string;
  startTime?: Date;
  closeTime?: Date;
  historyLength?: number;
} | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();

    return {
      status: description.status.name,
      startTime: description.startTime,
      closeTime: description.closeTime,
      historyLength: description.historyLength,
    };
  } catch (error) {
    logger.error(`Failed to get workflow info: ${workflowId}`, { error });
    return null;
  }
}

/**
 * Close the client connection
 */
export async function closeClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.connection.close();
    clientInstance = null;
    logger.info('Temporal client connection closed');
  }
}
