import {
  ApplicationFailure,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

import type { InputData, Report, ReportConfig, ReportStatus } from '../../shared/types/index.js';
import type * as activities from '../activities/index.js';

// Proxy activities with retry policies
const {
  profileData,
  generateInsights,
  generateCharts,
  renderLayout,
  exportFormats,
  finalizeReport,
  updateReportStatus,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: '30 seconds',
    nonRetryableErrorTypes: ['ValidationError', 'InvalidInputError'],
  },
});

// ============================================================================
// Workflow Signals and Queries
// ============================================================================

export const cancelWorkflowSignal = defineSignal('cancelWorkflow');
export const getStatusQuery = defineQuery<WorkflowState>('getStatus');
export const getProgressQuery = defineQuery<number>('getProgress');

// ============================================================================
// Workflow Input/Output Types
// ============================================================================

export interface ReportGenerationWorkflowInput {
  reportId: string;
  inputData: InputData[];
  config: ReportConfig;
}

export interface ReportGenerationWorkflowOutput {
  report: Report;
  success: boolean;
  error?: string;
}

interface WorkflowState {
  status: ReportStatus;
  progress: number;
  currentStep: string;
  error?: string;
}

// ============================================================================
// Main Report Generation Workflow
// ============================================================================

export async function reportGenerationWorkflow(
  input: ReportGenerationWorkflowInput
): Promise<ReportGenerationWorkflowOutput> {
  const { reportId, inputData, config } = input;

  // Initialize workflow state
  let state: WorkflowState = {
    status: 'QUEUED',
    progress: 0,
    currentStep: 'Initializing',
  };

  let cancelled = false;

  // Set up signal handlers
  setHandler(cancelWorkflowSignal, () => {
    cancelled = true;
  });

  // Set up query handlers
  setHandler(getStatusQuery, () => state);
  setHandler(getProgressQuery, () => state.progress);

  // Helper function to update state
  const updateState = async (status: ReportStatus, progress: number, currentStep: string) => {
    state = { status, progress, currentStep };
    await updateReportStatus({
      reportId,
      status,
      progress,
      currentStep,
    });
  };

  try {
    // ========================================================================
    // Step 1: Data Profiling (10%)
    // ========================================================================
    await updateState('DATA_PROFILING', 10, 'Analyzing and profiling input data');

    const { profile, parsedData, textContent } = await profileData({
      reportId,
      inputData,
    });

    // Signals are processed between workflow steps, so cancelled can change after await
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancelled) {
      throw ApplicationFailure.create({
        type: 'CancelledError',
        message: 'Workflow cancelled by user',
      });
    }

    // ========================================================================
    // Step 2: Insight Generation (30%)
    // ========================================================================
    await updateState('INSIGHT_GENERATION', 30, 'Generating insights with AI');

    const narrative = await generateInsights({
      reportId,
      profile,
      parsedData,
      textContent,
      config,
    });

    // Signals are processed between workflow steps, so cancelled can change after await
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancelled) {
      throw ApplicationFailure.create({
        type: 'CancelledError',
        message: 'Workflow cancelled by user',
      });
    }

    // ========================================================================
    // Step 3: Chart Generation (50%)
    // ========================================================================
    await updateState('CHART_GENERATION', 50, 'Creating visualizations');

    const charts = await generateCharts({
      reportId,
      profile,
      parsedData,
    });

    // Signals are processed between workflow steps, so cancelled can change after await
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancelled) {
      throw ApplicationFailure.create({
        type: 'CancelledError',
        message: 'Workflow cancelled by user',
      });
    }

    // ========================================================================
    // Step 4: Layout Rendering (70%)
    // ========================================================================
    await updateState('LAYOUT_RENDERING', 70, 'Rendering report layout');

    const html = await renderLayout({
      reportId,
      title: config.title,
      style: config.style,
      narrative,
      charts,
      profile,
      branding: config.branding,
    });

    // Signals are processed between workflow steps, so cancelled can change after await
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cancelled) {
      throw ApplicationFailure.create({
        type: 'CancelledError',
        message: 'Workflow cancelled by user',
      });
    }

    // ========================================================================
    // Step 5: Export Formats (90%)
    // ========================================================================
    await updateState('EXPORTING', 90, 'Exporting to requested formats');

    const files = await exportFormats({
      reportId,
      html,
      outputFormats: config.outputFormats,
      title: config.title,
      style: config.style,
      narrative,
      charts,
      profile,
      branding: config.branding,
    });

    // ========================================================================
    // Step 6: Finalize (100%)
    // ========================================================================
    await updateState('COMPLETED', 100, 'Report complete');

    const report = await finalizeReport({
      reportId,
      title: config.title,
      style: config.style,
      outputFormats: config.outputFormats,
      files,
      profile,
    });

    return {
      report,
      success: true,
    };
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    state = {
      status: 'FAILED',
      progress: state.progress,
      currentStep: 'Failed',
      error: errorMessage,
    };

    await updateReportStatus({
      reportId,
      status: 'FAILED',
      errorMessage,
    });

    return {
      report: {
        id: reportId,
        title: config.title,
        style: config.style,
        status: 'FAILED',
        outputFormats: config.outputFormats,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage,
      },
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Retry Failed Report Workflow
// ============================================================================

export interface RetryReportWorkflowInput {
  reportId: string;
  originalInput: ReportGenerationWorkflowInput;
  fromStep?: ReportStatus;
}

export async function retryReportWorkflow(
  input: RetryReportWorkflowInput
): Promise<ReportGenerationWorkflowOutput> {
  // For simplicity, just restart the workflow from the beginning
  // A more sophisticated implementation could resume from a specific step
  return reportGenerationWorkflow(input.originalInput);
}

